const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { PdfService } = require('./dist/pdf/pdf.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const pdfService = app.get(PdfService);

  try {
    const pdf = await pdfService.generateInvoicePdf({
      invoiceNumber: 'INV-123',
      issueDate: '2026-04-01T00:00:00Z',
      dueDate: '2026-04-15T00:00:00Z',
      businessName: 'My Business',
      businessAddress: '123 Main St',
      businessPhone: '+1234567890',
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      clientAddress: '456 Client Rd',
      items: [
        { description: 'Item 1', quantity: 1, unitPrice: 100, amount: 100 }
      ],
      subtotal: 100,
      taxRate: 0.19,
      taxAmount: 19,
      totalAmount: 119,
      status: 'PENDING',
      currency: 'TND'
    });
    console.log('PDF Generation Result: Success! Length:', pdf.length);
  } catch (error) {
    console.error('PDF Generation Error:', error);
  }
}
bootstrap();
