import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

export class CreatePackagingTypeDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacityValue?: number;

  @IsOptional()
  @IsUUID()
  capacityUnitId?: string;
}
