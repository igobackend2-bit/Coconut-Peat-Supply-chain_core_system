import { IsEmail, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length } from 'class-validator';

export const MILESTONES = ['LOADED', 'GATED_OUT', 'DEPARTED', 'ARRIVED', 'CUSTOMS_CLEARED', 'DELIVERED'] as const;

export class CreateExportCustomerDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsString() country!: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}

export class CreateProformaDto {
  @IsUUID() exportCustomerId!: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
}

export class CreateProformaItemDto {
  @IsUUID() productId!: string;
  @IsNumber() @IsPositive() quantity!: number;
  @IsNumber() @IsPositive() unitPrice!: number;
}

export class CreateContainerDto {
  @IsUUID() commercialInvoiceId!: string;
  @IsString() containerNumber!: string;
  @IsOptional() @IsString() sealNumber?: string;
  @IsOptional() @IsString() destinationPort?: string;
}

export class CreateMilestoneDto {
  @IsIn(MILESTONES as unknown as string[]) milestone!: (typeof MILESTONES)[number];
  @IsOptional() @IsString() notes?: string;
}
