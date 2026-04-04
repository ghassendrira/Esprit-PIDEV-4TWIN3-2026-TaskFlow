import { IsNotEmpty, IsString } from 'class-validator';

export class SecurityQuestionsDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  answer!: string;
}

