import { IsString, IsNumber } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  name!: string;

  @IsString()
  currency!: string;

  @IsNumber()
  taxRate!: number;
}
