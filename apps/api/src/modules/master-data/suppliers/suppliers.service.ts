import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { suppliers } from '../../../db/schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(suppliers);
  }

  async findOne(id: string) {
    const [supplier] = await this.db.select().from(suppliers).where(eq(suppliers.id, id));
    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    const existing = await this.db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.code, dto.code));
    if (existing.length > 0) {
      throw new ConflictException(`Supplier with code "${dto.code}" already exists`);
    }

    const [supplier] = await this.db.insert(suppliers).values(dto).returning();
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(suppliers)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();

    return updated;
  }

  // No delete — same rationale as ProductsService (master-data deletion requires an approval workflow that doesn't exist yet).
}
