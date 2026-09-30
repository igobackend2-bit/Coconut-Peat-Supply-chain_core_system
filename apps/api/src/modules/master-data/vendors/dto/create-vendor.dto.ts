import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const VENDOR_TYPES = ['TRANSPORT', 'MAINTENANCE', 'CONTRACT_LABOUR', 'OTHER'] as const;

export class CreateVendorDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsIn(VENDOR_TYPES)
  vendorType?: (typeof VENDOR_TYPES)[number];

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
