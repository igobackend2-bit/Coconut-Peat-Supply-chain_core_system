import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { permissions, rolePermissions, roles, userRoles, userSessions, users } from '../../db/schema';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly auth: AuthService,
  ) {}

  /** Administrator-created account, optionally with initial roles (all validated before anything is written). */
  async createUser(dto: CreateUserDto, assignedBy: string) {
    const roleIds = [...new Set(dto.roleIds ?? [])];
    if (roleIds.length > 0) {
      const found = await this.db.select({ id: roles.id }).from(roles).where(inArray(roles.id, roleIds));
      if (found.length !== roleIds.length) throw new BadRequestException('One or more roleIds do not exist');
    }
    const user = await this.auth.createUser(dto);
    for (const roleId of roleIds) {
      await this.db.insert(userRoles).values({ userId: user.id, roleId, assignedBy });
    }
    return user;
  }

  /** Users with their role codes. password_hash is never selected. */
  async listUsers() {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        roleId: roles.id,
        roleCode: roles.code,
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .orderBy(users.createdAt);
    const byId = new Map<string, Record<string, unknown> & { roles: { id: string; code: string }[] }>();
    for (const r of rows) {
      const u = byId.get(r.id) ?? { id: r.id, email: r.email, fullName: r.fullName, status: r.status, lastLoginAt: r.lastLoginAt, createdAt: r.createdAt, roles: [] };
      if (r.roleId && r.roleCode) u.roles.push({ id: r.roleId, code: r.roleCode });
      byId.set(r.id, u);
    }
    return [...byId.values()];
  }

  async listRoles() {
    const rows = await this.db
      .select({ id: roles.id, code: roles.code, name: roles.name, description: roles.description, isSystem: roles.isSystem, permission: permissions.code })
      .from(roles)
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .orderBy(roles.code);
    const byId = new Map<string, { id: string; code: string; name: string; description: string | null; isSystem: boolean; permissions: string[] }>();
    for (const r of rows) {
      const role = byId.get(r.id) ?? { id: r.id, code: r.code, name: r.name, description: r.description, isSystem: r.isSystem, permissions: [] };
      if (r.permission) role.permissions.push(r.permission);
      byId.set(r.id, role);
    }
    return [...byId.values()];
  }

  listPermissions() {
    return this.db.select().from(permissions).orderBy(permissions.module, permissions.code);
  }

  async assignRole(userId: string, roleId: string, assignedBy: string) {
    const [u] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (!u) throw new NotFoundException(`User ${userId} not found`);
    const [r] = await this.db.select({ id: roles.id }).from(roles).where(eq(roles.id, roleId));
    if (!r) throw new NotFoundException(`Role ${roleId} not found`);
    const [existing] = await this.db.select().from(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
    if (existing) throw new ConflictException('User already has this role');
    const [row] = await this.db.insert(userRoles).values({ userId, roleId, assignedBy }).returning();
    return row;
  }

  /** The last SUPER_ADMIN cannot be removed — that would lock everyone out of user management. */
  async removeRole(userId: string, roleId: string) {
    const [role] = await this.db.select().from(roles).where(eq(roles.id, roleId));
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    const [link] = await this.db.select().from(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
    if (!link) throw new NotFoundException('User does not have this role');
    if (role.code === 'SUPER_ADMIN') {
      const holders = await this.db.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, roleId));
      if (holders.length <= 1) throw new ConflictException('Cannot remove the last SUPER_ADMIN');
    }
    await this.db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
    return { userId, roleId };
  }

  async setStatus(userId: string, status: 'ACTIVE' | 'INACTIVE', actingUserId: string) {
    if (userId === actingUserId && status !== 'ACTIVE') throw new BadRequestException('You cannot deactivate your own account');
    const [row] = await this.db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId)).returning({ id: users.id, status: users.status });
    if (!row) throw new NotFoundException(`User ${userId} not found`);
    // A deactivated user must lose access immediately, not when their session happens to expire.
    if (status === 'INACTIVE') {
      await this.db.update(userSessions).set({ revokedAt: new Date() }).where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
    }
    return row;
  }
}
