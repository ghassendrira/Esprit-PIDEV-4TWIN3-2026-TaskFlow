import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

let puppeteerModule: any;
try {
  puppeteerModule = require('puppeteer');
} catch (e) {
  console.warn('Puppeteer not installed. Install with: npm install puppeteer');
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  currency: string;
}

export interface ExpenseReportItem {
  description: string;
  category: string;
  date: string;
  amount: number;
}

export interface ExpenseReportData {
  reportNumber: string;
  reportDate: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  businessName: string;
  businessAddress: string;
  items: ExpenseReportItem[];
  subtotal: number;
  approverName?: string;
  approvalDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currency: string;
}

@Injectable()
export class PdfService {
  private browser: any | null = null;

  async initBrowser(): Promise<void> {
    // Check if existing browser is still usable
    if (this.browser) {
      try {
        // Quick connectivity check
        await this.browser.version();
      } catch {
        // Browser crashed or disconnected – discard it
        this.browser = null;
      }
    }
    if (!this.browser) {
      if (!puppeteerModule) {
        throw new Error(
          'Puppeteer is not installed. Please install it with: npm install puppeteer',
        );
      }
      this.browser = await puppeteerModule.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async getLogoBase64(): Promise<string> {
    try {
      // Try multiple possible paths to find the logo
      const pathsToTry = [
        path.join(process.cwd(), '../../frontend/taskflow-web/public/TASKFLOW-removebg-preview.png'),
        path.join(__dirname, '../../../../frontend/taskflow-web/public/TASKFLOW-removebg-preview.png'),
        path.join(__dirname, '../../../../public/TASKFLOW-removebg-preview.png')
      ];

      for (const logoPath of pathsToTry) {
        try {
          await fs.access(logoPath);
          const logoBuffer = await fs.readFile(logoPath);
          return `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch (e) {
          continue;
        }
      }
      
      console.warn('Logo file not found in any path');
      return '';
    } catch (e) {
      console.error('Failed to load logo:', e);
      return '';
    }
  }

  async generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
    for (let attempt = 0; attempt < 2; attempt++) {
      await this.initBrowser();
      let page: any;
      try {
        page = await this.browser!.newPage();
        const logoBase64 = await this.getLogoBase64();
        const html = this.generateInvoiceHtml(data, logoBase64);
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.emulateMediaType('print');

        const pdf = await page.pdf({
          format: 'A4',
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in',
          },
          printBackground: true,
        });

        return pdf;
      } catch (err) {
        if (attempt === 0 && (err.message?.includes('closed') || err.message?.includes('timeout') || err.message?.includes('Timeout'))) {
          console.warn('Browser connection lost, retrying...');
          this.browser = null;
          continue;
        }
        throw err;
      } finally {
        try { await page?.close(); } catch {}
      }
    }
    throw new Error('PDF generation failed after retries');
  }

  async generateExpenseReportPdf(data: ExpenseReportData): Promise<Buffer> {
    await this.initBrowser();
    const page = await this.browser!.newPage();

    try {
      const logoBase64 = await this.getLogoBase64();
      const html = this.generateExpenseReportHtml(data, logoBase64);
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.emulateMediaType('print');

      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        printBackground: true,
      });

      return pdf;
    } finally {
      await page.close();
    }
  }

  private generateInvoiceHtml(data: InvoiceData, logoBase64: string): string {
    const primaryColor = '#4F46E5';
    const lightGray = '#f3f4f6';
    const darkGray = '#1f2937';
    const statusColors = {
      PAID: '#10b981',
      PENDING: '#f59e0b',
      OVERDUE: '#ef4444',
    };

    const itemRows = data.items
      .map((item, index) => {
        const isEvenRow = index % 2 === 0;
        return `
          <tr style="background-color: ${isEvenRow ? lightGray : '#ffffff'};">
            <td style="padding: 12px; border: none; font-size: 14px;">${this.escapeHtml(item.description)}</td>
            <td style="padding: 12px; border: none; font-size: 14px; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border: none; font-size: 14px; text-align: right;">${data.currency} ${item.unitPrice.toFixed(2)}</td>
            <td style="padding: 12px; border: none; font-size: 14px; text-align: right; font-weight: 600;">${data.currency} ${item.amount.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const statusColor = statusColors[data.status];

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f3f4f6;
      color: ${darkGray};
      line-height: 1.6;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 16mm;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .invoice {
      width: 100%;
      max-width: 210mm;
      background: white;
      border-radius: 20px;
      box-shadow: 0 30px 80px rgba(15, 23, 42, 0.08);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 36px 48px;
      gap: 24px;
    }
    .brand {
      display: grid;
      gap: 14px;
    }
    .brand-logo {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo img {
      width: 200px;
      height: auto;
      display: block;
      margin-bottom: 12px;
    }
    .brand-info p {
      margin: 4px 0;
      font-size: 12px;
      color: #6b7280;
      line-height: 1.6;
    }
    .invoice-meta {
      display: grid;
      gap: 10px;
      text-align: right;
    }
    .invoice-title {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: ${primaryColor};
    }
    .invoice-numbers {
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .status-badge {
      display: inline-flex;
      padding: 10px 18px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: white;
      background-color: ${statusColor};
      justify-self: end;
      margin-top: 12px;
    }
    .section {
      padding: 0 48px 48px;
    }
    .details-card {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 32px;
      padding: 24px;
      border-radius: 18px;
      border: 1px solid #e5e7eb;
      background: #f8fafc;
    }
    .detail-block label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .detail-block span {
      display: block;
      font-size: 14px;
      font-weight: 700;
      color: ${darkGray};
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    .panel {
      padding: 24px;
      border-radius: 18px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
    }
    .panel h3 {
      margin-bottom: 14px;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .panel p {
      margin: 6px 0;
      font-size: 13px;
      color: ${darkGray};
      line-height: 1.7;
    }
    .table-wrap {
      overflow-x: auto;
      margin-bottom: 32px;
    }
    .items-table {
      width: 100%;
      min-width: 700px;
      border-collapse: collapse;
    }
    .items-table th,
    .items-table td {
      padding: 18px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
      color: ${darkGray};
    }
    .items-table th {
      text-align: left;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background: #f8fafc;
      color: #475569;
    }
    .items-table th:last-child,
    .items-table td:last-child {
      text-align: right;
    }
    .summary-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 28px;
      align-items: start;
      margin-bottom: 40px;
    }
    .summary-box {
      border: 2px solid ${primaryColor};
      border-radius: 18px;
      padding: 24px;
      background: #ffffff;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 14px;
      font-size: 13px;
      color: ${darkGray};
    }
    .summary-row label {
      color: #6b7280;
      font-weight: 600;
    }
    .summary-row span {
      font-weight: 700;
    }
    .summary-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 18px 0;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 18px;
      font-weight: 800;
      color: ${primaryColor};
    }
    .notes {
      padding: 20px;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      font-size: 13px;
      color: ${darkGray};
      line-height: 1.7;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding: 26px 48px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    .footer p {
      margin: 4px 0;
    }
    @media print {
      body { background: white; }
      .page { background: white; padding: 0; }
      .invoice { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <article class="invoice">
      <section class="invoice-header">
        <div class="brand">
          <div class="brand-logo">
            ${logoBase64 ? `<img src="${logoBase64}" alt="TaskFlow" />` : '<h2 style="color: #4F46E5; font-size: 24px; font-weight: 800;">TaskFlow</h2>'}
          </div>
          <div class="brand-info">
            <p><strong>${this.escapeHtml(data.businessName)}</strong></p>
            <p>${this.escapeHtml(data.businessAddress)}</p>
            <p>${this.escapeHtml(data.businessPhone)}</p>
          </div>
        </div>
        <div class="invoice-meta">
          <div class="invoice-title">INVOICE</div>
          <div class="invoice-numbers">N°: ${this.escapeHtml(data.invoiceNumber)}</div>
          <div class="status-badge">${data.status}</div>
        </div>
      </section>

      <section class="section">
        <div class="details-card">
          <div class="detail-block">
            <label>Issue Date</label>
            <span>${new Date(data.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div class="detail-block">
            <label>Due Date</label>
            <span>${new Date(data.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div class="detail-block">
            <label>Client</label>
            <span>${this.escapeHtml(data.clientName)}</span>
          </div>
        </div>

        <div class="grid-2">
          <div class="panel">
            <h3>Bill To</h3>
            <p><strong>${this.escapeHtml(data.clientName)}</strong></p>
            <p>${this.escapeHtml(data.clientEmail)}</p>
            <p>${this.escapeHtml(data.clientAddress)}</p>
          </div>
          <div class="panel">
            <h3>From</h3>
            <p><strong>${this.escapeHtml(data.businessName)}</strong></p>
            <p>${this.escapeHtml(data.businessAddress)}</p>
            <p>${this.escapeHtml(data.businessPhone)}</p>
          </div>
        </div>

        <div class="table-wrap">
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </div>

        <div class="summary-layout">
          <div>
            ${data.notes ? `<div class="notes"><strong>Notes</strong><br>${this.escapeHtml(data.notes)}</div>` : ''}
          </div>
          <div class="summary-box">
            <div class="summary-row"><label>Subtotal</label><span>${data.currency} ${data.subtotal.toFixed(2)}</span></div>
            <div class="summary-row"><label>Tax (${(data.taxRate * 100).toFixed(0)}% TVA)</label><span>${data.currency} ${data.taxAmount.toFixed(2)}</span></div>
            <div class="summary-divider"></div>
            <div class="summary-total"><label>Total</label><span>${data.currency} ${data.totalAmount.toFixed(2)}</span></div>
          </div>
        </div>
      </section>

      <footer class="footer">
        <p>Thank you for your business. Please pay via the TaskFlow payment portal or bank transfer.</p>
        <p>www.taskflow.com</p>
      </footer>
    </article>
  </div>
</body>
</html>`;
  }

  private generateExpenseReportHtml(data: ExpenseReportData, logoBase64: string): string {
    const primaryColor = '#4F46E5';
    const lightGray = '#f3f4f6';
    const darkGray = '#1f2937';
    const statusColors = {
      PENDING: '#f59e0b',
      APPROVED: '#10b981',
      REJECTED: '#ef4444',
    };

    const itemRows = data.items
      .map((item, index) => {
        const isEvenRow = index % 2 === 0;
        return `
          <tr style="background-color: ${isEvenRow ? lightGray : '#ffffff'};">
            <td style="padding: 12px; border: none; font-size: 14px;">${this.escapeHtml(item.description)}</td>
            <td style="padding: 12px; border: none; font-size: 14px; text-align: center;">${this.escapeHtml(item.category)}</td>
            <td style="padding: 12px; border: none; font-size: 14px; text-align: center;">${new Date(item.date).toLocaleDateString('en-US')}</td>
            <td style="padding: 12px; border: none; font-size: 14px; text-align: right; font-weight: 600;">${data.currency} ${item.amount.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const statusColor = statusColors[data.status];

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expense Report ${data.reportNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: white;
      color: ${darkGray};
      line-height: 1.6;
    }
    .container {
      max-width: 210mm;
      height: 297mm;
      margin: 0 auto;
      padding: 0;
      background: white;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
    }
    .content {
      padding: 40px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 20px;
    }
    .logo {
      height: 60px;
      width: auto;
      display: block;
      margin-bottom: 12px;
    }
    .report-title {
      text-align: right;
    }
    .report-title h1 {
      font-size: 28px;
      font-weight: 700;
      color: ${primaryColor};
      margin: 0;
    }
    .report-title p {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
      font-size: 13px;
    }
    .info-block {
      line-height: 1.8;
    }
    .info-block h3 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .info-block p {
      margin: 0;
      color: ${darkGray};
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 20px;
      background-color: ${lightGray};
    }
    .detail-item {
      font-size: 12px;
    }
    .detail-item label {
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 4px;
    }
    .detail-item value {
      font-size: 14px;
      font-weight: 600;
      color: ${darkGray};
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
      font-size: 13px;
    }
    .items-table thead tr {
      background-color: ${primaryColor};
      color: white;
    }
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: none;
    }
    .items-table th:nth-child(2),
    .items-table th:nth-child(3),
    .items-table th:nth-child(4) {
      text-align: center;
    }
    .items-table th:last-child {
      text-align: right;
    }
    .items-table td {
      border: 1px solid #e5e7eb;
    }
    .summary {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
      min-height: 1fr;
      flex: 1;
    }
    .summary-box {
      width: 300px;
      border: 2px solid ${primaryColor};
      border-radius: 8px;
      padding: 20px;
      background-color: #f9fafb;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .summary-row label {
      color: #6b7280;
      font-weight: 500;
    }
    .summary-row value {
      font-weight: 600;
      color: ${darkGray};
    }
    .summary-divider {
      border-top: 2px solid #e5e7eb;
      margin: 12px 0;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 18px;
      font-weight: 700;
      color: ${primaryColor};
    }
    .status-badge {
      display: inline-block;
      background-color: ${statusColor};
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    .footer p {
      margin: 4px 0;
    }
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <div class="header">
        <div>
          ${logoBase64 ? `<img src="${logoBase64}" alt="TaskFlow" class="logo">` : '<h2 style="color: #4F46E5; font-size: 24px; font-weight: 800; margin-bottom: 12px;">TaskFlow</h2>'}
          <div style="margin-top: 10px; font-size: 12px; line-height: 1.6; color: #6b7280;">
            <p style="margin: 0; font-weight: 600;">${this.escapeHtml(data.businessName)}</p>
            <p style="margin: 0;">${this.escapeHtml(data.businessAddress)}</p>
          </div>
        </div>
        <div class="report-title">
          <h1>EXPENSE REPORT</h1>
          <p>#${this.escapeHtml(data.reportNumber)}</p>
          <div class="status-badge">${data.status}</div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-block">
          <h3>Submitted By</h3>
          <p style="font-weight: 600; margin-bottom: 4px;">${this.escapeHtml(data.employeeName)}</p>
          <p>${this.escapeHtml(data.employeeEmail)}</p>
          <p>${this.escapeHtml(data.department)}</p>
        </div>
        <div class="info-block" style="text-align: right;">
          <div style="margin-bottom: 16px;">
            <h3>Report Date</h3>
            <p>${new Date(data.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          ${data.approvalDate ? `
          <div>
            <h3>Approved By</h3>
            <p>${this.escapeHtml(data.approverName || 'N/A')}</p>
            <p>${new Date(data.approvalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          ` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 40%;">Description</th>
            <th style="width: 20%; text-align: center;">Category</th>
            <th style="width: 20%; text-align: center;">Date</th>
            <th style="width: 20%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; flex: 1;">
        <div></div>
        <div class="summary">
          <div class="summary-box">
            <div class="summary-row">
              <label>Total Expenses</label>
              <value>${data.currency} ${data.subtotal.toFixed(2)}</value>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-total">
              <label>Total</label>
              <value>${data.currency} ${data.subtotal.toFixed(2)}</value>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p><strong>Thank you for your submission!</strong></p>
        <p>© 2026 TaskFlow. All rights reserved. | <strong>www.taskflow.com</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
