import { Body, Controller, Get, Post, Query, Res, Req, UnauthorizedException, UseGuards, HttpException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { NotificationService } from './notification.service';
import { PdfService } from './pdf/pdf.service';
import type { InvoiceData } from './pdf/pdf.service';

@Controller('notification')
export class NotificationHttpController {
  constructor(
    private readonly service: NotificationService,
    private readonly pdfService: PdfService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('invoice-pdf')
  async downloadInvoicePdf(
    @Query('invoiceId') invoiceId: string,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const user = (req as any).user || {};
      const tenantId = (req.headers['x-tenant-id'] as string) || user.tenantId || user.businessId;
      const userId = (req.headers['x-user-id'] as string) || user.sub || user.id;

      if (!tenantId) {
        throw new UnauthorizedException('Tenant ID missing');
      }

      // 1. Fetch invoice from invoice-service
      const invoiceUrl = `${process.env.INVOICE_SERVICE_URL || 'http://localhost:3005'}/invoices/${invoiceId}`;
      const invRes = await fetch(invoiceUrl, {
        headers: { 'x-tenant-id': tenantId }
      });
      
      if (!invRes.ok) {
        res.status(invRes.status).json({ error: 'Invoice not found or access denied' });
        return;
      }
      
      const invoice = await invRes.json();

      // 2. Fetch business info
      let businessName = 'Votre Entreprise';
      let businessAddress = '';
      let businessPhone = '';
      try {
        const busRes = await fetch(`${process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003'}/businesses/${invoice.businessId}`);
        if (busRes.ok) {
          const business = await busRes.json();
          businessName = business.name;
          businessAddress = business.address || '';
          businessPhone = business.phone || '';
        }
      } catch (e) {
        console.error('Error fetching business info:', e.message);
      }

      // 3. Fetch client info
      let clientName = 'Client';
      let clientEmail = '';
      let clientAddress = '';
      try {
        const cliRes = await fetch(`${process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003'}/clients/${invoice.clientId}`);
        if (cliRes.ok) {
          const client = await cliRes.json();
          clientName = client.name;
          clientEmail = client.email;
          clientAddress = client.address || '';
        }
      } catch (e) {
        console.error('Error fetching client info:', e.message);
      }

      // 4. Prepare data for PDF
      const subtotal = invoice.totalAmount - invoice.taxAmount;
      const pdfData: InvoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: new Date(invoice.issueDate).toLocaleDateString('fr-FR'),
        dueDate: new Date(invoice.dueDate).toLocaleDateString('fr-FR'),
        businessName,
        businessAddress,
        businessPhone,
        clientName,
        clientEmail,
        clientAddress,
        items: invoice.items.map((it: any) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: it.amount,
        })),
        subtotal,
        taxRate: 0, // Not explicitly in invoice model but can be inferred if needed
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        notes: invoice.notes,
        status: (invoice.status === 'PAID' ? 'PAID' : (invoice.status === 'OVERDUE' ? 'OVERDUE' : 'PENDING')) as any,
        currency: 'TND',
      };

      const pdf = await this.pdfService.generateInvoicePdf(pdfData);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdf.length,
        // Lets the browser read Content-Disposition across origins (for filename).
        'Access-Control-Expose-Headers': 'Content-Disposition',
      });
      res.send(pdf);
    } catch (error) {
      // Preserve real HTTP errors (401/403/404...) instead of turning them into 500s.
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const responseBody = error.getResponse();
        res.status(status).json(
          typeof responseBody === 'string' ? { message: responseBody } : responseBody,
        );
        return;
      }
      console.error('PDF Generation Error:', error);
      res.status(500).json({ error: 'Failed to generate invoice PDF: ' + error.message });
    }
  }

  @Post('welcome')
  async welcome(@Body() body: { email: string; fullName: string; userId: string }) {
    await this.service.sendWelcomeEmail({
      email: body?.email ?? '',
      fullName: body?.fullName ?? '',
      userId: body?.userId ?? '',
    });
    return { success: true };
  }

  @Post('admin-registration')
  async adminRegistration(@Body() body: any) {
    await this.service.sendAdminRegistrationNotification(body);
    return { success: true };
  }

  @Post('approval')
  async approval(@Body() body: any) {
    await this.service.sendApprovalEmail(body);
    return { success: true };
  }

  @Post('rejection')
  async rejection(@Body() body: any) {
    await this.service.sendRejectionEmail(body);
    return { success: true };
  }

  @Post('employee-welcome')
  async employeeWelcome(@Body() body: any) {
    await this.service.sendEmployeeWelcomeEmail(body);
    return { success: true };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    await this.service.sendResetPasswordEmail(body);
    return { success: true };
  }

  @Post('admin-password-request')
  async adminPasswordRequest(@Body() body: any) {
    await this.service.sendAdminPasswordRequestNotification(body);
    return { success: true };
  }

  @Post('invoice')
  async sendInvoice(@Body() body: any) {
    await this.service.sendInvoiceEmail(body);
    return { success: true };
  }

  @Post('smart-email')
  async sendSmartEmail(@Body() body: { email: string; clientName: string; subject: string; textBody: string; pdfBase64: string; invoiceNumber: string }) {
    await this.service.sendSmartInvoiceEmail(body);
    return { success: true };
  }

  @Post('expense-approved')
  async expenseApproved(@Body() body: any) {
    await this.service.sendExpenseApprovedEmail(body);
    return { success: true };
  }

  @Post('expense-rejected')
  async expenseRejected(@Body() body: any) {
    await this.service.sendExpenseRejectedEmail(body);
    return { success: true };
  }

  @Post('invoice-pdf')
  async generateInvoicePdf(@Body() data: InvoiceData, @Res() res: Response): Promise<void> {
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
}
