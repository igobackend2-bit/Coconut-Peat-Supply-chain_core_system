import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

const ENTITY_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacityKg?: number;

  @IsOptional()
  @IsIn(ENTITY_STATUSES)
  status?: (typeof ENTITY_STATUSES)[number];
}
