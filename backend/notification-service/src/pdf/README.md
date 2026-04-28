# PDF Generation Module - TaskFlow

Professional PDF generation for invoices and expense reports using Puppeteer and HTML/CSS rendering.

## Features

✅ **Modern SaaS Design** - Clean, professional layout with TaskFlow branding
✅ **Responsive & Printable** - A4 format, optimized for printing
✅ **Dynamic Status Badges** - Color-coded status indicators
✅ **Professional Tables** - Alternating rows, proper spacing and alignment
✅ **Summary Sections** - Highlighted totals and key information
✅ **Easy Integration** - Simple HTTP endpoints, works with any frontend

## Design

### Colors
- **Primary**: `#4F46E5` (TaskFlow brand purple)
- **Light Background**: `#f3f4f6`
- **Dark Text**: `#1f2937`
- **Status Colors**:
  - Paid/Approved: `#10b981` (Green)
  - Pending: `#f59e0b` (Orange)
  - Overdue/Rejected: `#ef4444` (Red)

### Typography
- **System Font Stack**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`
- **Modern, clean, professional**

## Installation

```bash
# Install Puppeteer
npm install puppeteer

# For production, also install:
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

## API Endpoints

### Generate Invoice PDF

**POST** `/pdf/invoice`

**Request Body:**
```json
{
  "invoiceNumber": "INV-2026-001",
  "issueDate": "2026-04-07",
  "dueDate": "2026-05-07",
  "businessName": "TaskFlow Inc.",
  "businessAddress": "123 Business St, San Francisco, CA 94102",
  "businessPhone": "+1 (555) 123-4567",
  "clientName": "John Doe",
  "clientEmail": "john@company.com",
  "clientAddress": "456 Client Ave, New York, NY 10001",
  "items": [
    {
      "description": "Service Description",
      "quantity": 10,
      "unitPrice": 100,
      "amount": 1000
    }
  ],
  "subtotal": 1000,
  "taxRate": 0.1,
  "taxAmount": 100,
  "totalAmount": 1100,
  "notes": "Thank you for your business!",
  "status": "PENDING",
  "currency": "USD"
}
```

**Response:**
- PDF file as buffer with appropriate headers
- Content-Disposition: `attachment; filename="invoice-INV-2026-001.pdf"`

### Generate Expense Report PDF

**POST** `/pdf/expense-report`

**Request Body:**
```json
{
  "reportNumber": "EXP-2026-001",
  "reportDate": "2026-04-07",
  "employeeName": "Jane Smith",
  "employeeEmail": "jane@company.com",
  "department": "Sales",
  "businessName": "TaskFlow Inc.",
  "businessAddress": "123 Business St, San Francisco, CA 94102",
  "items": [
    {
      "description": "Flight to New York",
      "category": "Travel",
      "date": "2026-03-15",
      "amount": 450
    }
  ],
  "subtotal": 450,
  "approverName": "Manager Name",
  "approvalDate": "2026-04-01",
  "status": "APPROVED",
  "currency": "USD"
}
```

**Response:**
- PDF file as buffer with appropriate headers
- Content-Disposition: `attachment; filename="expense-report-EXP-2026-001.pdf"`

## Usage Example

### Frontend (Angular/TypeScript)

```typescript
// Generate invoice PDF
const invoiceData = {
  invoiceNumber: 'INV-2026-001',
  issueDate: '2026-04-07',
  dueDate: '2026-05-07',
  // ... rest of data
};

fetch('http://localhost:3000/pdf/invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(invoiceData),
})
  .then(res => res.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  });
```

### Backend (NestJS Service)

```typescript
import { Injectable } from '@nestjs/common';
import { PdfService } from './pdf/pdf.service';

@Injectable()
export class InvoiceService {
  constructor(private pdfService: PdfService) {}

  async generatePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoiceData(invoiceId);
    return this.pdfService.generateInvoicePdf(invoice);
  }
}
```

## PDF Structure

### Invoice PDF
```
┌─────────────────────────────────────┐
│ HEADER                              │
│ - TaskFlow Logo                     │
│ - Company Info                      │
│ - Invoice Title & Number            │
│ - Status Badge                      │
├─────────────────────────────────────┤
│ BILL TO & DATES                     │
│ - Client Information                │
│ - Issue & Due Dates                 │
├─────────────────────────────────────┤
│ ITEMS TABLE                         │
│ - Description | Qty | Price | Amt   │
│ - Alternating row colors            │
├─────────────────────────────────────┤
│ SUMMARY                             │
│ - Subtotal                          │
│ - Tax                               │
│ - TOTAL (highlighted)               │
├─────────────────────────────────────┤
│ NOTES (if provided)                 │
├─────────────────────────────────────┤
│ FOOTER                              │
│ - Thank you message                 │
│ - Copyright & branding              │
└─────────────────────────────────────┘
```

### Expense Report PDF
Similar structure with:
- Employee information instead of client
- Category column in items table
- Approval information in upper right
- Simpler summary (single total)

## Configuration

### Browser Options
The PdfService launches Puppeteer with these defaults:
- `headless: 'new'` - Latest headless mode
- `--no-sandbox` - For Docker/container compatibility
- `--disable-setuid-sandbox` - Security sandbox disabled

### PDF Options
- **Format**: A4 (210mm × 297mm)
- **Margins**: 0.5 inches on all sides
- **Print Background**: Enabled (for colors)

### Custom Configuration

To customize, modify `pdf.service.ts`:

```typescript
async generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    printBackground: true,
    scale: 1,
    preferCSSPageSize: true,
  });
  return pdf;
}
```

## Performance Considerations

### Browser Pooling
- Single browser instance shared across requests
- Browser reused for performance
- Automatic cleanup on module destroy

### What's Slow
- **First Request**: ~2-3 seconds (browser launch)
- **Subsequent Requests**: ~500-1000ms each

### Optimization Tips
1. Consider browser pooling library for high volume
2. Add caching for frequently generated PDFs
3. Use job queue for bulk generation
4. Generate PDFs asynchronously when possible

## Production Deployment

### Docker
```dockerfile
FROM node:18-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    libxss1 \
    libappindicator1 \
    libindicator7 \
    fonts-liberation \
    xdg-utils \
    libgconf-2-4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start:prod"]
```

### Environment Variables
```env
# Optional: Custom Chromium path
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Optional: Disable sandbox (for Docker)
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
```

## Troubleshooting

### "Failed to launch Chrome"
- Install Chromium: `apt-get install chromium-browser`
- Or set: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false`

### "Timeout waiting for page to render"
- Increase timeout in `page.pdf()` options
- Check image URLs are accessible
- Verify CSS is loading correctly

### "PDF is blank or partially rendered"
- Check `waitUntil: 'networkidle0'` is working
- Verify all resources load (fonts, images, CSS)
- Use `page.screenshot()` to debug

### Memory Issues
- Don't keep browser references open
- Call `closeBrowser()` on module destroy
- Consider pooling for concurrent requests

## Security

✅ **HTML Escaping** - All user input is escaped
✅ **No Code Injection** - Templates are static
✅ **Sandbox Mode** - Puppeteer runs in isolated process
✅ **Resource Limits** - Timeouts prevent hang
✅ **No Remote Content** - Only local data rendered

## Future Enhancements

- [ ] PDF signing and encryption
- [ ] Multiple language support
- [ ] Custom templates and branding
- [ ] Batch generation with job queues
- [ ] PDF compression and optimization
- [ ] Email delivery integration
- [ ] Cloud storage backup (S3, GCS)

## License

UNLICENSED

## Support

For issues or questions, contact the TaskFlow development team.
