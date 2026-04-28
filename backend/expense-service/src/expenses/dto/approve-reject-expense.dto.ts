import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ApproveRejectExpenseDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  reason: string;
}
