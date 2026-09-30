import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const PRODUCT_CATEGORIES = ['RAW_MATERIAL', 'FINISHED_GOOD', 'PACKAGING', 'CONSUMABLE'] as const;

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(PRODUCT_CATEGORIES)
  category!: (typeof PRODUCT_CATEGORIES)[number];

  @IsOptional()
  @IsUUID()
  baseUnitId?: string;

  @IsOptional()
  @IsString()
  hsCode?: string;
}
