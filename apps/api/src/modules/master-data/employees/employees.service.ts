import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { employees } from '../../../db/schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(employees);
  }

  async findOne(id: string) {
    const [emp] = await this.db.select().from(employees).where(eq(employees.id, id));
    if (!emp) throw new NotFoundException(`Employee ${id} not found`);
    return emp;
  }

  async create(dto: CreateEmployeeDto) {
    const existing = await this.db.select({ id: employees.id }).from(employees).where(eq(employees.employeeCode, dto.employeeCode));
    if (existing.length > 0) throw new ConflictException(`Employee with code "${dto.employeeCode}" already exists`);

    const [emp] = await this.db.insert(employees).values(dto).returning();
    return emp;
  }
}
