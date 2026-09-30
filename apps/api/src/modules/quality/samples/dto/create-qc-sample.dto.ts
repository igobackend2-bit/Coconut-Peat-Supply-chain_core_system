import { IsUUID } from 'class-validator';

export class CreateQcSampleDto {
  @IsUUID()
  productionBatchId!: string;
}
