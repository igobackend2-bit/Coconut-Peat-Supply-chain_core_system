import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Matches, Max } from 'class-validator';

export class CreateShiftDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM (24h)' }) startTime!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:MM (24h)' }) endTime!: string;
}

export class CreateAttendanceDto {
  @IsUUID() employeeId!: string;
  @IsOptional() @IsUUID() shiftId?: string;
  @IsDateString() workDate!: string;
  @IsIn(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY']) status!: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY';
  @IsOptional() @IsString() notes?: string;
}

export class CreateAllocationDto {
  @IsUUID() employeeId!: string;
  @IsDateString() workDate!: string;
  @IsNumber() @IsPositive() @Max(12) hours!: number;
  @IsString() task!: string;
  @IsOptional() @IsUUID() productionBatchId?: string;
  @IsOptional() @IsUUID() machineId?: string;
}
