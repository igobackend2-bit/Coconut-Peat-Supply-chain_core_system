import { IsUUID } from 'class-validator';

export class CreateSalesOrderDto {
  @IsUUID()
  customerId!: string;
}
