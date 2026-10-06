import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePlanDto {
  @IsUUID() machineId!: string;
  @IsString() title!: string;
  @IsInt() @Min(1) frequencyDays!: number;
  @IsDateString() nextDueDate!: string;
}

export class ReportBreakdownDto {
  @IsUUID() machineId!: string;
  @IsString() description!: string;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class ResolveDto {
  @IsOptional() @IsString() notes?: string;
}

export class CreateWorkOrderDto {
  @IsUUID() machineId!: string;
  @IsIn(['PREVENTIVE', 'CORRECTIVE']) type!: 'PREVENTIVE' | 'CORRECTIVE';
  @IsString() title!: string;
  @IsOptional() @IsUUID() breakdownId?: string;
  @IsOptional() @IsUUID() maintenancePlanId?: string;
  @IsOptional() @IsUUID() assignedToEmployeeId?: string;
}

export class CreateSparePartDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsInt() @Min(0) quantityOnHand?: number;
  @IsOptional() @IsInt() @Min(0) reorderLevel?: number;
}

export class AdjustSparePartDto {
  @IsInt() delta!: number;
}
