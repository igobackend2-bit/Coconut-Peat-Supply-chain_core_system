import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const LOCATION_TYPES = ['STORAGE', 'BAY', 'RACK', 'YARD', 'DOCK'] as const;

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsIn(LOCATION_TYPES)
  type?: (typeof LOCATION_TYPES)[number];
}
