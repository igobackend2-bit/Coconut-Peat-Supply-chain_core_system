import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { customers } from '../../../db/schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(customers);
  }

  async findOne(id: string) {
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, id));
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.db.select({ id: customers.id }).from(customers).where(eq(customers.code, dto.code));
    if (existing.length > 0) {
      throw new ConflictException(`Customer with code "${dto.code}" already exists`);
    }

    const [customer] = await this.db.insert(customers).values(this.toColumns(dto)).returning();
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(customers)
      .set({ ...this.toColumns(dto), updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    return updated;
  }

  // No delete — same rationale as ProductsService.

  /** Drizzle's `numeric` column is typed as string (to avoid float precision loss on money), but the API accepts a JSON number — convert at the boundary. */
  private toColumns<T extends { creditLimit?: number }>(dto: T) {
    return {
      ...dto,
      creditLimit: dto.creditLimit !== undefined ? dto.creditLimit.toString() : undefined,
    };
  }
}
