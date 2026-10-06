import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateCostCentreDto {
  @IsString() code!: string;
  @IsString() name!: string;
}

export class CreateExpenseDto {
  @IsOptional() @IsUUID() costCentreId?: string;
  @IsIn(['RAW_MATERIAL', 'LABOUR', 'UTILITIES', 'MAINTENANCE', 'LOGISTICS', 'PACKAGING', 'OTHER'])
  category!: 'RAW_MATERIAL' | 'LABOUR' | 'UTILITIES' | 'MAINTENANCE' | 'LOGISTICS' | 'PACKAGING' | 'OTHER';
  @IsString() description!: string;
  @IsNumber() @IsPositive() amount!: number;
  @IsDateString() expenseDate!: string;
}

export class DecideExpenseDto {
  @IsOptional() @IsString() reason?: string;
}

export class CreatePaymentDto {
  @IsIn(['INCOMING', 'OUTGOING']) direction!: 'INCOMING' | 'OUTGOING';
  @IsOptional() @IsUUID() salesOrderId?: string;
  @IsOptional() @IsUUID() purchaseOrderId?: string;
  @IsNumber() @IsPositive() amount!: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() reference?: string;
}
