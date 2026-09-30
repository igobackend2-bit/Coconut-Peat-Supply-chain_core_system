import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { unitsOfMeasure } from '../../../db/schema';
import { CreateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';

@Injectable()
export class UnitsOfMeasureService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(unitsOfMeasure);
  }

  async findOne(id: string) {
    const [uom] = await this.db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.id, id));
    if (!uom) throw new NotFoundException(`Unit of measure ${id} not found`);
    return uom;
  }

  async create(dto: CreateUnitOfMeasureDto) {
    const existing = await this.db.select({ id: unitsOfMeasure.id }).from(unitsOfMeasure).where(eq(unitsOfMeasure.code, dto.code));
    if (existing.length > 0) throw new ConflictException(`Unit of measure with code "${dto.code}" already exists`);

    const [uom] = await this.db.insert(unitsOfMeasure).values(dto).returning();
    return uom;
  }
}
