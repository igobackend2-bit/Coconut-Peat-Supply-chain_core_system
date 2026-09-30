import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { warehouses } from '../../../db/schema';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(warehouses);
  }

  async findOne(id: string) {
    const [warehouse] = await this.db.select().from(warehouses).where(eq(warehouses.id, id));
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }
    return warehouse;
  }

  async create(dto: CreateWarehouseDto) {
    const existing = await this.db
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(eq(warehouses.code, dto.code));
    if (existing.length > 0) {
      throw new ConflictException(`Warehouse with code "${dto.code}" already exists`);
    }

    const [warehouse] = await this.db.insert(warehouses).values(dto).returning();
    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(warehouses)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(warehouses.id, id))
      .returning();

    return updated;
  }

  // No delete — same rationale as ProductsService.
}
