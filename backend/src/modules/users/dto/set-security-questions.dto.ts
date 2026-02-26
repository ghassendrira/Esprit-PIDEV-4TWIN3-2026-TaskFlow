import { IsArray, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SecurityQaDto {
  @IsString()
  @MinLength(3)
  question!: string;

  @IsString()
  @MinLength(1)
  answer!: string;
}

export class SetSecurityQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SecurityQaDto)
  qas!: SecurityQaDto[];
}
