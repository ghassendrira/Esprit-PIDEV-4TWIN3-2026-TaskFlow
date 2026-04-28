import { IsOptional, IsString, IsUUID, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';
import { ExpenseStatus } from '@prisma/client';

export class ListExpensesDto {
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @IsNotEmpty()
  @IsUUID()
  businessId: string;
}
