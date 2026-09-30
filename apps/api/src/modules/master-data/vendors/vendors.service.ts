import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { vendors } from '../../../db/schema';
import { CreateVendorDto } from './dto/create-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(vendors);
  }

  async findOne(id: string) {
    const [vendor] = await this.db.select().from(vendors).where(eq(vendors.id, id));
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async create(dto: CreateVendorDto) {
    const existing = await this.db.select({ id: vendors.id }).from(vendors).where(eq(vendors.code, dto.code));
    if (existing.length > 0) throw new ConflictException(`Vendor with code "${dto.code}" already exists`);

    const [vendor] = await this.db.insert(vendors).values(dto).returning();
    return vendor;
  }
}
