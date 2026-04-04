import { InvoiceStatus } from '@prisma/client';

export type CreateInvoiceDto = {
  businessId: string;
  clientId: string;
  createdBy?: string;
  invoiceNumber?: string;
  status?: InvoiceStatus;
  issueDate?: string;
  dueDate?: string;
  taxAmount?: number;
  totalAmount?: number;
  pdfUrl?: string;
  notes?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount?: number;
  }>;
};

export type UpdateInvoiceDto = Partial<CreateInvoiceDto>;
