import { IsNumber, IsOptional, IsPositive, IsUUID, Max, Min } from 'class-validator';

export class CreateRawMaterialLotDto {
  @IsUUID()
  goodsReceiptId!: string;

  @IsNumber()
  @IsPositive()
  quantityKg!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  moistureContentPercent?: number;

  @IsOptional()
  @IsUUID()
  storageLocationId?: string;
}
