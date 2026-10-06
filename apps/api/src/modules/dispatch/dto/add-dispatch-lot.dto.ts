import { IsUUID } from 'class-validator';

export class AddDispatchLotDto {
  @IsUUID()
  packingLotId!: string;
}
