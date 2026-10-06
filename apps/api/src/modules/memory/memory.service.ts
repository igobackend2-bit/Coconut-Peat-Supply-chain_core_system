import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { memoryItems } from '../../db/schema';
import { RequestUser } from '../identity/types';
import { CreateMemoryDto, ReviseMemoryDto } from './memory.dto';

export const CONFIDENTIAL_READ = 'memory.confidential.read';

@Injectable()
export class MemoryService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  private canSeeConfidential(user: RequestUser) {
    return user.permissions.includes(CONFIDENTIAL_READ);
  }

  private decorate<T extends { validUntil: Date | null }>(row: T) {
    return { ...row, expired: row.validUntil != null && row.validUntil.getTime() < Date.now() };
  }

  /** CONFIDENTIAL items are filtered out for users without memory.confidential.read (docs/memory.md §12). */
  async list(user: RequestUser, f: { type?: string; status?: string; q?: string }) {
    const conds: SQL[] = [];
    if (f.type) conds.push(eq(memoryItems.memoryType, f.type as never));
    conds.push(eq(memoryItems.status, (f.status ?? 'ACTIVE') as never));
    if (f.q) {
      const like = `%${f.q}%`;
      conds.push(or(ilike(memoryItems.title, like), ilike(memoryItems.content, like)) as SQL);
    }
    const rows = await this.db.select().from(memoryItems).where(and(...conds)).orderBy(desc(memoryItems.createdAt));
    return rows.filter((r) => r.sensitivity !== 'CONFIDENTIAL' || this.canSeeConfidential(user)).map((r) => this.decorate(r));
  }

  private async find(id: string, user: RequestUser) {
    const [row] = await this.db.select().from(memoryItems).where(eq(memoryItems.id, id));
    // A confidential item the caller can't see is reported as not found, not as forbidden.
    if (!row || (row.sensitivity === 'CONFIDENTIAL' && !this.canSeeConfidential(user))) {
      throw new NotFoundException(`Memory item ${id} not found`);
    }
    return row;
  }

  async create(dto: CreateMemoryDto, user: RequestUser) {
    const [row] = await this.db
      .insert(memoryItems)
      .values({
        memoryType: dto.memoryType,
        title: dto.title,
        content: dto.content,
        sensitivity: dto.sensitivity ?? 'INTERNAL',
        confidence: (dto.confidence ?? 1).toFixed(2),
        tags: dto.tags ?? [],
        linkedEntityType: dto.linkedEntityType,
        linkedEntityId: dto.linkedEntityId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        createdBy: user.id,
      })
      .returning();
    return this.decorate(row);
  }

  /** Never overwrites: writes version n+1 and marks the old row SUPERSEDED (docs/memory.md §8). */
  async revise(id: string, dto: ReviseMemoryDto, user: RequestUser) {
    const old = await this.find(id, user);
    if (old.status !== 'ACTIVE') throw new ConflictException(`Memory item ${id} is "${old.status}" — only an ACTIVE item can be revised`);
    const [next] = await this.db
      .insert(memoryItems)
      .values({
        memoryType: old.memoryType,
        title: dto.title ?? old.title,
        content: dto.content,
        sensitivity: old.sensitivity,
        sourceType: old.sourceType,
        confidence: dto.confidence != null ? dto.confidence.toFixed(2) : old.confidence,
        tags: old.tags,
        linkedEntityType: old.linkedEntityType,
        linkedEntityId: old.linkedEntityId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : old.validUntil,
        version: old.version + 1,
        supersedesMemoryId: old.id,
        createdBy: user.id,
      })
      .returning();
    await this.db.update(memoryItems).set({ status: 'SUPERSEDED' }).where(eq(memoryItems.id, old.id));
    return this.decorate(next);
  }

  async archive(id: string, user: RequestUser) {
    const row = await this.find(id, user);
    if (row.status !== 'ACTIVE') throw new ConflictException(`Memory item ${id} is "${row.status}" — only an ACTIVE item can be archived`);
    const [updated] = await this.db.update(memoryItems).set({ status: 'ARCHIVED' }).where(eq(memoryItems.id, id)).returning();
    return this.decorate(updated);
  }

  /** The whole version chain this item belongs to, oldest first. */
  async history(id: string, user: RequestUser) {
    let cursor = await this.find(id, user);
    while (cursor.supersedesMemoryId) {
      const [prev] = await this.db.select().from(memoryItems).where(eq(memoryItems.id, cursor.supersedesMemoryId));
      if (!prev) break;
      cursor = prev;
    }
    const chain = [cursor];
    for (;;) {
      const [next] = await this.db.select().from(memoryItems).where(eq(memoryItems.supersedesMemoryId, chain[chain.length - 1].id));
      if (!next) break;
      chain.push(next);
    }
    return chain.map((r) => this.decorate(r));
  }
}
