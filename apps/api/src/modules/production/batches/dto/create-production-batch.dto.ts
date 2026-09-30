import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreateProductionBatchDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  productGradeId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  plannedQuantityKg?: number;
}
