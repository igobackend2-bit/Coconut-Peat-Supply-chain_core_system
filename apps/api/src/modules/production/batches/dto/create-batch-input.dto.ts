import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateBatchInputDto {
  @IsUUID()
  rawMaterialLotId!: string;

  @IsNumber()
  @IsPositive()
  quantityConsumedKg!: number;
}
