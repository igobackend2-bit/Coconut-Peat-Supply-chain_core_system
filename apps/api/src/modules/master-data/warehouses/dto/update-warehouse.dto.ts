import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const WAREHOUSE_TYPES = ['RAW_MATERIAL', 'FINISHED_GOODS', 'PACKAGING', 'GENERAL'] as const;
const ENTITY_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(WAREHOUSE_TYPES)
  type?: (typeof WAREHOUSE_TYPES)[number];

  @IsOptional()
  @IsIn(ENTITY_STATUSES)
  status?: (typeof ENTITY_STATUSES)[number];
}
