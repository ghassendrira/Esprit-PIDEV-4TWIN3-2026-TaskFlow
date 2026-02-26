import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CompanyRole } from '@prisma/client';

export class CreateEmployeeRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsEnum(CompanyRole)
  role!: CompanyRole;

  @IsOptional()
  @IsString()
  note?: string;
}
