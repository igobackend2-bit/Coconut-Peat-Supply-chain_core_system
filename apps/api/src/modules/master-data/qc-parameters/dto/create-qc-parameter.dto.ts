import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const QC_DATA_TYPES = ['NUMERIC', 'TEXT', 'BOOLEAN'] as const;

export class CreateQcParameterDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsIn(QC_DATA_TYPES)
  dataType?: (typeof QC_DATA_TYPES)[number];

  @IsOptional()
  @IsUUID()
  unitId?: string;
}
