import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { products } from '../../../db/schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(products);
  }

  async findOne(id: string) {
    const [product] = await this.db.select().from(products).where(eq(products.id, id));
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.db.select({ id: products.id }).from(products).where(eq(products.sku, dto.sku));
    if (existing.length > 0) {
      throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
    }

    const [product] = await this.db.insert(products).values(dto).returning();
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id); // 404s before attempting the update if the id doesn't exist

    const [updated] = await this.db
      .update(products)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return updated;
  }

  // No delete method yet: docs/agents.md §3 lists master-data deletion as
  // a high-risk operation requiring approval, and no approval workflow
  // exists yet (docs/project-state.md). Deactivate via
  // update(id, { status: 'INACTIVE' }) instead for now.
}
