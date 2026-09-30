import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { gateEntries, weighments } from '../../../db/schema';
import { CreateWeighmentDto } from './dto/create-weighment.dto';

@Injectable()
export class WeighmentsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(weighments);
  }

  async findOne(id: string) {
    const [weighment] = await this.db.select().from(weighments).where(eq(weighments.id, id));
    if (!weighment) {
      throw new NotFoundException(`Weighment ${id} not found`);
    }
    return weighment;
  }

  /**
   * Duplicate-weighment prevention (product-requirements.md §4.3) has
   * two layers: the DB-level UNIQUE(gate_entry_id) constraint (belt),
   * and this service-level status check (suspenders) — this one gives a
   * clear 409 instead of surfacing a raw constraint-violation error to
   * the caller.
   */
  async create(dto: CreateWeighmentDto) {
    const [gateEntry] = await this.db.select().from(gateEntries).where(eq(gateEntries.id, dto.gateEntryId));
    if (!gateEntry) {
      throw new NotFoundException(`Gate entry ${dto.gateEntryId} not found`);
    }
    if (gateEntry.status !== 'AT_GATE') {
      throw new ConflictException(
        `Gate entry ${dto.gateEntryId} is already "${gateEntry.status}" — a gate entry can only be weighed once`,
      );
    }
    if (dto.tareWeightKg >= dto.grossWeightKg) {
      throw new BadRequestException('tareWeightKg must be less than grossWeightKg');
    }

    const netWeightKg = dto.grossWeightKg - dto.tareWeightKg;

    const [weighment] = await this.db
      .insert(weighments)
      .values({
        gateEntryId: dto.gateEntryId,
        productId: dto.productId,
        grossWeightKg: dto.grossWeightKg.toString(),
        tareWeightKg: dto.tareWeightKg.toString(),
        netWeightKg: netWeightKg.toString(),
      })
      .returning();

    await this.db.update(gateEntries).set({ status: 'WEIGHED' }).where(eq(gateEntries.id, dto.gateEntryId));

    return weighment;
  }
}
