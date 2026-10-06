import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreatePackingOrderDto {
  @IsUUID()
  productionBatchId!: string;

  @IsUUID()
  packagingTypeId!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  plannedQuantityUnits?: number;
}
