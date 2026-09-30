import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../db/drizzle.provider';

/**
 * Minimal health endpoints to prove the NestJS + Drizzle skeleton is
 * actually wired end-to-end (not just "compiles"), per project-state.md's
 * "never claim false completion" rule.
 *
 * GET /health     — process is up, no DB dependency.
 * GET /health/db  — round-trips a query through Drizzle to the database.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  @Get()
  getHealth() {
    return { status: 'ok', service: 'coco-pith-factory-api' };
  }

  @Get('db')
  async getDbHealth() {
    const result = await this.db.execute(sql`select 1 as ok`);
    return { status: 'ok', db: result[0] };
  }
}
