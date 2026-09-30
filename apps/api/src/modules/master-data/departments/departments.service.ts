import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { departments } from '../../../db/schema';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(departments);
  }

  async findOne(id: string) {
    const [dept] = await this.db.select().from(departments).where(eq(departments.id, id));
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    const existing = await this.db.select({ id: departments.id }).from(departments).where(eq(departments.code, dto.code));
    if (existing.length > 0) throw new ConflictException(`Department with code "${dto.code}" already exists`);

    const [dept] = await this.db.insert(departments).values(dto).returning();
    return dept;
  }
}
