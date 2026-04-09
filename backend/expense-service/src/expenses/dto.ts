import { ExpenseStatus } from '@prisma/client';

export type CreateExpenseDto = {
  businessId: string;
  amount: number;
  date?: string;
  description?: string;
  receiptUrl?: string;
  status?: ExpenseStatus;
  createdBy: string;
};

export type UpdateExpenseDto = Partial<Omit<CreateExpenseDto, 'createdBy'>>;
