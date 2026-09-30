import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateGateEntryDto {
  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
