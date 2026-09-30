import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreateBatchOutputDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  productGradeId?: string;

  @IsNumber()
  @IsPositive()
  quantityKg!: number;
}
