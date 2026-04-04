import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateBusinessDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @IsString() category?: string;
}
