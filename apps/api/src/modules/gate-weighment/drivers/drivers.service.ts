import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { drivers } from '../../../db/schema';
import { CreateDriverDto } from './dto/create-driver.dto';

@Injectable()
export class DriversService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(drivers);
  }

  async findOne(id: string) {
    const [driver] = await this.db.select().from(drivers).where(eq(drivers.id, id));
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return driver;
  }

  async create(dto: CreateDriverDto) {
    const [driver] = await this.db.insert(drivers).values(dto).returning();
    return driver;
  }
}
