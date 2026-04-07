import { IsNumber, IsString, IsUUID, IsOptional, IsDateString, IsUrl, Min } from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUrl()
  receiptUrl?: string;
}
