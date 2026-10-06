import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';
import { RegisterUserDto } from './register-user.dto';

export class CreateUserDto extends RegisterUserDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  roleIds?: string[];
}
