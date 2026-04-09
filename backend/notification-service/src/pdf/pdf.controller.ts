import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PdfService } from './pdf.service';
import type { InvoiceData, ExpenseReportData } from './pdf.service';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('invoice')
  async generateInvoice(@Body() data: InvoiceData, @Res() res: Response): Promise<void> {
    try {
      const pdf = await this.pdfService.generateInvoicePdf(data);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${data.invoiceNumber}.pdf"`,
        'Content-Length': pdf.length,
      });
      res.send(pdf);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
  }

  @Post('expense-report')
  async generateExpenseReport(
    @Body() data: ExpenseReportData,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const pdf = await this.pdfService.generateExpenseReportPdf(data);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="expense-report-${data.reportNumber}.pdf"`,
        'Content-Length': pdf.length,
      });
      res.send(pdf);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate expense report PDF' });
    }
  }
}
