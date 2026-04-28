import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBusinessDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsNotEmpty() @IsString() currency!: string;
  @IsNotEmpty() @IsNumber() taxRate!: number;
  @IsOptional() @IsString() category?: string;
}
