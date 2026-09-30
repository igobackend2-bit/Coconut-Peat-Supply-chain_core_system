import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { gateEntries } from '../../../db/schema';
import { CreateGateEntryDto } from './dto/create-gate-entry.dto';

@Injectable()
export class GateEntriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(gateEntries);
  }

  async findOne(id: string) {
    const [entry] = await this.db.select().from(gateEntries).where(eq(gateEntries.id, id));
    if (!entry) {
      throw new NotFoundException(`Gate entry ${id} not found`);
    }
    return entry;
  }

  async create(dto: CreateGateEntryDto) {
    const [entry] = await this.db.insert(gateEntries).values(dto).returning();
    return entry;
  }
}
