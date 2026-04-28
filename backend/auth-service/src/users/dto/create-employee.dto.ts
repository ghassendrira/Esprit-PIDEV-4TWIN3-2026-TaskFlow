import { IsEmail, IsNotEmpty, IsString, IsIn } from 'class-validator';

export class CreateEmployeeDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsIn(['ACCOUNTANT', 'ADMIN', 'TEAM_MEMBER'])
  role!: 'ACCOUNTANT' | 'ADMIN' | 'TEAM_MEMBER';
}

