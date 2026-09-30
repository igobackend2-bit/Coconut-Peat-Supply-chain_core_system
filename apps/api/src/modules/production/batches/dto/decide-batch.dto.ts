import { IsOptional, IsString } from 'class-validator';

export class DecideBatchDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
