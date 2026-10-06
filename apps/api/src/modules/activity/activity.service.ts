import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, lte, SQL } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { auditEvents } from '../../db/schema';

export interface ActivityFilter {
  module?: string;
  actionType?: string;
  status?: string;
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ActivityService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list(f: ActivityFilter) {
    const conds: SQL[] = [];
    if (f.module) conds.push(eq(auditEvents.module, f.module));
    if (f.actionType) conds.push(eq(auditEvents.actionType, f.actionType));
    if (f.status) conds.push(eq(auditEvents.status, f.status));
    if (f.entityType) conds.push(eq(auditEvents.entityType, f.entityType));
    if (f.actorId) conds.push(eq(auditEvents.actorId, f.actorId));
    if (f.from) conds.push(gte(auditEvents.createdAt, new Date(f.from)));
    if (f.to) conds.push(lte(auditEvents.createdAt, new Date(f.to)));
    const limit = Math.min(Math.max(f.limit ?? 100, 1), 500);
    return this.db
      .select()
      .from(auditEvents)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit)
      .offset(Math.max(f.offset ?? 0, 0));
  }

  async findOne(id: string) {
    const [row] = await this.db.select().from(auditEvents).where(eq(auditEvents.id, id));
    if (!row) throw new NotFoundException(`Audit event ${id} not found`);
    return row;
  }

  /** Distinct values for the filter dropdowns. */
  async meta() {
    const all = await this.db
      .selectDistinct({ module: auditEvents.module, actionType: auditEvents.actionType, status: auditEvents.status })
      .from(auditEvents);
    return {
      modules: [...new Set(all.map((r) => r.module))].sort(),
      actionTypes: [...new Set(all.map((r) => r.actionType))].sort(),
      statuses: [...new Set(all.map((r) => r.status))].sort(),
    };
  }
}
