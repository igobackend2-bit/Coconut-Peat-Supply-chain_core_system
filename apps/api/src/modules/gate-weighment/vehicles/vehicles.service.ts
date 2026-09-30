import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { vehicles } from '../../../db/schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(vehicles);
  }

  async findOne(id: string) {
    const [vehicle] = await this.db.select().from(vehicles).where(eq(vehicles.id, id));
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return vehicle;
  }

  async create(dto: CreateVehicleDto) {
    const existing = await this.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.registrationNumber, dto.registrationNumber));
    if (existing.length > 0) {
      throw new ConflictException(`Vehicle with registration "${dto.registrationNumber}" already exists`);
    }

    const [vehicle] = await this.db.insert(vehicles).values(dto).returning();
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    const [updated] = await this.db.update(vehicles).set(dto).where(eq(vehicles.id, id)).returning();
    return updated;
  }
}
