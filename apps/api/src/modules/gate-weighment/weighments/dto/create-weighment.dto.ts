import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreateWeighmentDto {
  @IsUUID()
  gateEntryId!: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsNumber()
  @IsPositive()
  grossWeightKg!: number;

  @IsNumber()
  @IsPositive()
  tareWeightKg!: number;
}
