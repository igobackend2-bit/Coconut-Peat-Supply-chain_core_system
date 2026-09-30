import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { qcParameters } from '../../../db/schema';
import { CreateQcParameterDto } from './dto/create-qc-parameter.dto';

@Injectable()
export class QcParametersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(qcParameters);
  }

  async findOne(id: string) {
    const [param] = await this.db.select().from(qcParameters).where(eq(qcParameters.id, id));
    if (!param) throw new NotFoundException(`QC parameter ${id} not found`);
    return param;
  }

  async create(dto: CreateQcParameterDto) {
    const existing = await this.db.select({ id: qcParameters.id }).from(qcParameters).where(eq(qcParameters.code, dto.code));
    if (existing.length > 0) throw new ConflictException(`QC parameter with code "${dto.code}" already exists`);

    const [param] = await this.db.insert(qcParameters).values(dto).returning();
    return param;
  }
}
