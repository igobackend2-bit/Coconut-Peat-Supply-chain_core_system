import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId!: string;

  @IsUUID()
  productId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsNumber()
  @IsPositive()
  unitPrice!: number;
}
