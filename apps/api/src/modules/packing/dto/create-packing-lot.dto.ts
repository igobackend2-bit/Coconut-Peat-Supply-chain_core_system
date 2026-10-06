import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreatePackingLotDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @IsPositive()
  quantityUnits!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  netWeightKg?: number;
}
