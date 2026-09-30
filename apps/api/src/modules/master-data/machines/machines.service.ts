import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { machines } from '../../../db/schema';
import { CreateMachineDto } from './dto/create-machine.dto';

@Injectable()
export class MachinesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(machines);
  }

  async findOne(id: string) {
    const [machine] = await this.db.select().from(machines).where(eq(machines.id, id));
    if (!machine) throw new NotFoundException(`Machine ${id} not found`);
    return machine;
  }

  async create(dto: CreateMachineDto) {
    const existing = await this.db.select({ id: machines.id }).from(machines).where(eq(machines.code, dto.code));
    if (existing.length > 0) throw new ConflictException(`Machine with code "${dto.code}" already exists`);

    const [machine] = await this.db
      .insert(machines)
      .values({
        ...dto,
        capacityPerHour: dto.capacityPerHour !== undefined ? dto.capacityPerHour.toString() : undefined,
      })
      .returning();
    return machine;
  }
}
