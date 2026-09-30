import { IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  registrationNumber!: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacityKg?: number;
}
