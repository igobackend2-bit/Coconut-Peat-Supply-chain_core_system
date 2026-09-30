import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { locations } from '../../../db/schema';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class LocationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(locations);
  }

  async findOne(id: string) {
    const [loc] = await this.db.select().from(locations).where(eq(locations.id, id));
    if (!loc) throw new NotFoundException(`Location ${id} not found`);
    return loc;
  }

  async create(dto: CreateLocationDto) {
    const existing = await this.db.select({ id: locations.id }).from(locations).where(eq(locations.code, dto.code));
    if (existing.length > 0) throw new ConflictException(`Location with code "${dto.code}" already exists`);

    const [loc] = await this.db.insert(locations).values(dto).returning();
    return loc;
  }
}
