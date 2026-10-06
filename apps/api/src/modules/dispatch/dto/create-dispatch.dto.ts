import { IsOptional, IsUUID } from 'class-validator';

export class CreateDispatchDto {
  @IsUUID()
  salesOrderId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;
}
