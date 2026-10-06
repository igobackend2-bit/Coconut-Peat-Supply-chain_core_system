import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { and, count, eq, gt, isNull, ne, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import {
  permissions as permissionsTable,
  rolePermissions,
  roles as rolesTable,
  userRoles,
  userSessions,
  users,
} from '../../db/schema';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RequestUser } from './types';

// Compared against when the email is unknown, so a missing account and a wrong password take the same time.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', 10);

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — arbitrary default, not yet configurable

export interface SessionResult {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * First-run bootstrap only. Once any user exists, self-registration is
   * closed (403) and accounts are created by an administrator through
   * `POST /users`. The very first account becomes SUPER_ADMIN so a fresh
   * install is usable. An advisory lock makes "is this the first user?"
   * atomic, so two simultaneous requests can't both become admin.
   */
  async register(dto: RegisterUserDto) {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(7311001)`);
      const [{ n }] = await tx.select({ n: count() }).from(users);
      if (n > 0) {
        throw new ForbiddenException('Self-registration is closed. Ask an administrator to create your account.');
      }
      const existing = await tx.select({ id: users.id }).from(users).where(eq(users.email, dto.email));
      if (existing.length > 0) {
        throw new ConflictException('A user with this email already exists');
      }
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const [user] = await tx.insert(users).values({ email: dto.email, passwordHash, fullName: dto.fullName, phone: dto.phone }).returning();
      const [admin] = await tx.select({ id: rolesTable.id }).from(rolesTable).where(eq(rolesTable.code, 'SUPER_ADMIN'));
      if (admin) await tx.insert(userRoles).values({ userId: user.id, roleId: admin.id });
      return this.sanitizeUser(user);
    });
  }

  /** Creates an account with no roles. Callers (UsersService) are responsible for authorising it. */
  async createUser(dto: RegisterUserDto) {
    const existing = await this.db.select({ id: users.id }).from(users).where(eq(users.email, dto.email));
    if (existing.length > 0) {
      throw new ConflictException('A user with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [user] = await this.db
      .insert(users)
      .values({ email: dto.email, passwordHash, fullName: dto.fullName, phone: dto.phone })
      .returning();
    return this.sanitizeUser(user);
  }

  async validateCredentials(dto: LoginDto) {
    const [user] = await this.db.select().from(users).where(eq(users.email, dto.email));
    // Always run one bcrypt comparison, and give the same answer for "no such user",
    // "wrong password" and "deactivated", so none of them can be told apart from outside.
    const passwordMatches = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async createSession(userId: string, userAgent: string | null): Promise<SessionResult> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.db.insert(userSessions).values({
      userId,
      tokenHash,
      userAgent,
      expiresAt,
    });

    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));

    return { token, expiresAt };
  }

  async revokeSession(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.tokenHash, tokenHash));
  }

  /**
   * Validates a bearer token and returns the authenticated user with
   * their roles and permission codes, or null if the token is missing,
   * unknown, revoked, or expired. Used by SessionAuthGuard.
   */
  async authenticate(token: string): Promise<RequestUser | null> {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    const [session] = await this.db
      .select({ userId: userSessions.userId })
      .from(userSessions)
      .where(and(eq(userSessions.tokenHash, tokenHash), isNull(userSessions.revokedAt), gt(userSessions.expiresAt, now)));

    if (!session) {
      return null;
    }

    const [user] = await this.db.select().from(users).where(eq(users.id, session.userId));
    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    const { roleCodes, permissionCodes } = await this.getRolesAndPermissions(user.id);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: roleCodes,
      permissions: permissionCodes,
    };
  }

  private async getRolesAndPermissions(userId: string) {
    const rows = await this.db
      .select({ roleCode: rolesTable.code, permissionCode: permissionsTable.code })
      .from(userRoles)
      .innerJoin(rolesTable, eq(rolesTable.id, userRoles.roleId))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, rolesTable.id))
      .leftJoin(permissionsTable, eq(permissionsTable.id, rolePermissions.permissionId))
      .where(eq(userRoles.userId, userId));

    const roleCodes = new Set<string>();
    const permissionCodes = new Set<string>();
    for (const row of rows) {
      roleCodes.add(row.roleCode);
      if (row.permissionCode) permissionCodes.add(row.permissionCode);
    }

    return { roleCodes: [...roleCodes], permissionCodes: [...permissionCodes] };
  }

  /** Verifies the current password, sets the new one, and revokes every other session for the user (the caller's own session stays valid). */
  async changePassword(userId: string, currentPassword: string, newPassword: string, currentToken: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      // 400, not 401: the web client treats any 401 as "session expired" and logs the user out.
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    const keep = this.hashToken(currentToken);
    await this.db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt), ne(userSessions.tokenHash, keep)));
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Explicit allow-list (not an omit) so a new sensitive column added to `users` later doesn't leak by default. */
  private sanitizeUser(user: typeof users.$inferSelect) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      employeeId: user.employeeId,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
