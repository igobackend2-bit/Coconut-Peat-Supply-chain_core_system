import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const WAREHOUSE_TYPES = ['RAW_MATERIAL', 'FINISHED_GOODS', 'PACKAGING', 'GENERAL'] as const;

export class CreateWarehouseDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsIn(WAREHOUSE_TYPES)
  type?: (typeof WAREHOUSE_TYPES)[number];
}
