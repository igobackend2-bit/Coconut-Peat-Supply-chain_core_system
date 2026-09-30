import { IsNumber, IsUUID } from 'class-validator';

export class CreateQcResultDto {
  @IsUUID()
  qcParameterId!: string;

  @IsNumber()
  measuredValue!: number;
}
