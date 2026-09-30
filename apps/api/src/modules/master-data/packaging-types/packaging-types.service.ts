import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { packagingTypes } from '../../../db/schema';
import { CreatePackagingTypeDto } from './dto/create-packaging-type.dto';

@Injectable()
export class PackagingTypesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(packagingTypes);
  }

  async findOne(id: string) {
    const [pkg] = await this.db.select().from(packagingTypes).where(eq(packagingTypes.id, id));
    if (!pkg) throw new NotFoundException(`Packaging type ${id} not found`);
    return pkg;
  }

  async create(dto: CreatePackagingTypeDto) {
    const existing = await this.db.select({ id: packagingTypes.id }).from(packagingTypes).where(eq(packagingTypes.code, dto.code));
    if (existing.length > 0) throw new ConflictException(`Packaging type with code "${dto.code}" already exists`);

    const [pkg] = await this.db
      .insert(packagingTypes)
      .values({
        ...dto,
        capacityValue: dto.capacityValue !== undefined ? dto.capacityValue.toString() : undefined,
      })
      .returning();
    return pkg;
  }
}
