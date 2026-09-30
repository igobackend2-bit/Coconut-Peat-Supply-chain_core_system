import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const UOM_CATEGORIES = ['WEIGHT', 'COUNT', 'VOLUME', 'AREA', 'OTHER'] as const;

export class CreateUnitOfMeasureDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsIn(UOM_CATEGORIES)
  category?: (typeof UOM_CATEGORIES)[number];
}
