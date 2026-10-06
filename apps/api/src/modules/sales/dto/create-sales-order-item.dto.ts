import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateSalesOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @IsPositive()
  unitPrice!: number;
}
