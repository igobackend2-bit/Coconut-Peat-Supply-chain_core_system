import { IsOptional, IsString } from 'class-validator';

export class DecidePurchaseOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
