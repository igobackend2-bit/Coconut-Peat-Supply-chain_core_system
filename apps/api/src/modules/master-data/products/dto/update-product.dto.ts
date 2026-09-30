import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const PRODUCT_CATEGORIES = ['RAW_MATERIAL', 'FINISHED_GOOD', 'PACKAGING', 'CONSUMABLE'] as const;
const ENTITY_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

// Not derived from CreateProductDto via PartialType (@nestjs/mapped-types
// isn't a dependency yet) — small enough to duplicate for now.
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES)
  category?: (typeof PRODUCT_CATEGORIES)[number];

  @IsOptional()
  @IsUUID()
  baseUnitId?: string;

  @IsOptional()
  @IsString()
  hsCode?: string;

  @IsOptional()
  @IsIn(ENTITY_STATUSES)
  status?: (typeof ENTITY_STATUSES)[number];
}
