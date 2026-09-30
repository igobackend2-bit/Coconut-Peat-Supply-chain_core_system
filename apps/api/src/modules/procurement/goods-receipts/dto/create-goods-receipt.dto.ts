import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreateGoodsReceiptDto {
  @IsUUID()
  purchaseOrderId!: string;

  @IsOptional()
  @IsUUID()
  weighmentId?: string;

  @IsNumber()
  @IsPositive()
  receivedQuantity!: number;
}
