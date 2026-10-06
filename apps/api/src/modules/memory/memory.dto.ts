import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export const MEMORY_TYPES = [
  'FACT', 'DECISION', 'INSTRUCTION', 'PREFERENCE', 'CONFIGURATION', 'SOP', 'PRODUCT_KNOWLEDGE', 'SUPPLIER_KNOWLEDGE',
  'CUSTOMER_KNOWLEDGE', 'INCIDENT', 'LESSON', 'ASSUMPTION', 'OBSERVATION', 'OPEN_ISSUE', 'TASK_CONTEXT',
] as const;
export type MemoryTypeValue = (typeof MEMORY_TYPES)[number];

export class CreateMemoryDto {
  @IsIn(MEMORY_TYPES as unknown as string[]) memoryType!: MemoryTypeValue;
  @IsString() title!: string;
  @IsString() content!: string;
  @IsOptional() @IsIn(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']) sensitivity?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
  @IsOptional() @IsNumber() @Min(0) @Max(1) confidence?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() linkedEntityType?: string;
  @IsOptional() @IsUUID() linkedEntityId?: string;
  @IsOptional() @IsDateString() validUntil?: string;
}

export class ReviseMemoryDto {
  @IsOptional() @IsString() title?: string;
  @IsString() content!: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) confidence?: number;
  @IsOptional() @IsDateString() validUntil?: string;
}
