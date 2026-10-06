import { IsOptional, IsString } from 'class-validator';

export class DeliverDispatchDto {
  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}
