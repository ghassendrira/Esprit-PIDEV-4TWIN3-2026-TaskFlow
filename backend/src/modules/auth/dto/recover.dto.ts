import {
  IsArray,
  IsEmail,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecoverGetQuestionsDto {
  @IsEmail()
  email!: string;
}

export class RecoverAnswerDto {
  @IsString()
  @MinLength(3)
  question!: string;

  @IsString()
  @MinLength(1)
  answer!: string;
}

export class RecoverVerifyDto {
  @IsEmail()
  email!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecoverAnswerDto)
  answers!: RecoverAnswerDto[];
}

export class RecoverResetDto {
  @IsString()
  @MinLength(1)
  recoveryToken!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
