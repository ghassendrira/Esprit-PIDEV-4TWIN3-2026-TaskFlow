# TaskFlow Invoice Design System

A modern, professional, premium invoice design template for TaskFlow - a SaaS business management platform. Optimized for SMEs with light/dark mode support, printable A4 format, and fully customizable with JavaScript.

## 📋 Features

✅ **Modern Premium Design** - Clean, minimalist UI inspired by Stripe and Notion  
✅ **Light & Dark Mode** - Automatic detection via CSS media queries  
✅ **Responsive** - Works on desktop and mobile  
✅ **Printable** - Optimized for A4 format printing  
✅ **Professional Typography** - System fonts for optimal display  
✅ **Status Badges** - Color-coded (PAID, PENDING, OVERDUE)  
✅ **Dynamic Item Tables** - Easy to customize and update  
✅ **Summary Section** - Subtotal, Tax, Total calculations  
✅ **Soft Shadows & Rounded Corners** - Modern aesthetic  
✅ **TaskFlow Branding** - Integrated logo and colors  

## 🎨 Design Components

### Header Section
- **TaskFlow Logo** (top-left, SVG format)
- **Company Information**
  - Company name, address, city, email, phone
- **Invoice Title** 
  - Large, bold "INVOICE" text
  - Invoice number below
- **Modern Divider** - Gradient accent line

### Invoice Details
- **Issue Date**
- **Due Date**
- **Total Amount**

### Client Information
- **Company Name**
- **Contact Person**
- **Job Title**
- **Email & Address**

### Items & Services Table
- **Description** (60% width)
- **Quantity** (center aligned)
- **Unit Price** (right aligned)
- **Total** (right aligned)
- **Alternating Row Colors** - Zebra striping for readability
- **Clean Borders** - Subtle separators

### Summary Section
- **Subtotal**
- **Tax (TVA)** - Configurable percentage
- **Total Due** - Highlighted in primary color
- **Premium Box Style** - Purple border, light background

### Status Badge
- **PAID** - Green (#10B981)
- **PENDING** - Orange (#F59E0B)
- **OVERDUE** - Red (#EF4444)

### Footer
- **Thank You Message**
- **Payment Instructions**
  - Bank transfer details
  - Credit card payment option
- **Copyright & Website**

## 🎯 Color System

### Light Mode (Default)
- **Background**: White (#FFFFFF)
- **Surface**: Light Gray (#F8FAFC)
- **Primary**: Indigo (#4F46E5)
- **Text**: Dark (#0F172A)
- **Borders**: Light Gray (#E2E8F0)
- **Secondary Text**: Medium Gray (#64748B)

### Dark Mode
- **Background**: Dark Navy (#0F172A)
- **Surface**: Slate (#1E293B)
- **Primary**: Indigo (#4F46E5)
- **Text**: Light Gray (#E2E8F0)
- **Borders**: Dark Gray (#334155)
- **Secondary Text**: Medium Gray (#CBD5E1)

### Status Colors
- **Success/Paid**: Green (#10B981)
- **Warning/Pending**: Orange (#F59E0B)
- **Danger/Overdue**: Red (#EF4444)

## 📦 Files Included

### 1. `invoice-template.html`
- Complete static HTML invoice template
- All CSS embedded for portability
- Works standalone in any browser
- Perfect for print layout testing

### 2. `invoice-generator.js`
- JavaScript class for dynamic invoice generation
- Data-driven rendering
- Easy customization
- PDF export support (with html2pdf library)

## 🚀 Quick Start

### Option A: Static Template (HTML)

```html
<!-- Open invoice-template.html in a browser -->
<!-- Edit the hardcoded values within the HTML -->
<!-- Print to PDF or physical printer -->
```

### Option B: Dynamic Generation (JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Embed CSS from invoice-template.html here -->
</head>
<body>
  <div id="invoice-container"></div>

  <script src="invoice-generator.js"></script>
  <script>
    const invoice = new InvoiceGenerator({
      invoiceNumber: 'INV-2026-00042',
      issueDate: 'April 7, 2026',
      dueDate: 'May 7, 2026',
      clientName: 'Acme Corporation',
      clientEmail: 'john.smith@acme.com',
      items: [
        {
          description: 'TaskFlow Pro - Annual Subscription',
          quantity: 1,
          unitPrice: 3600
        },
        {
          description: 'Premium Support Package (12 months)',
          quantity: 1,
          unitPrice: 1200
        },
        {
          description: 'Custom Integration Setup',
          quantity: 1,
          unitPrice: 600
        }
      ],
      taxRate: 0.08,
      status: 'PENDING'
    });

    invoice.render('#invoice-container');
  </script>
</body>
</html>
```

## 📘 JavaScript API Reference

### Constructor

```javascript
const invoice = new InvoiceGenerator(config);
```

**Config Options:**

```javascript
{
  invoiceNumber: 'INV-2026-00001',      // Invoice number
  issueDate: 'April 7, 2026',            // Issue date
  dueDate: 'May 7, 2026',                // Due date
  companyName: 'TaskFlow Inc.',          // Your company name
  companyAddress: '123 Business St',     // Company address line 1
  companyCity: 'San Francisco, CA 94102', // Company city/state/zip
  companyEmail: 'contact@taskflow.com',  // Company email
  companyPhone: '+1 (555) 123-4567',     // Company phone
  clientName: 'Acme Corporation',        // Client/customer name
  contactPerson: 'John Smith',           // Contact person name
  contactTitle: 'Director of Operations', // Contact job title
  clientEmail: 'john@company.com',       // Client email
  clientAddress: '456 Enterprise Ave',   // Client address
  clientCity: 'New York, NY 10001',      // Client city/state/zip
  items: [
    {
      description: 'Service Description',
      quantity: 1,
      unitPrice: 1000
    }
  ],
  taxRate: 0.08,                         // Tax rate (0.08 = 8%)
  status: 'PENDING',                     // PENDING, PAID, OVERDUE
  currency: '$',                         // Currency symbol
  notes: 'Thank you message...',         // Invoice notes
  paymentInstructions: {                 // Payment details
    bankTransfer: 'Bank details...',
    creditCard: 'Card payment details...'
  }
}
```

### Methods

#### `render(containerId)`
Render the invoice into a DOM container.

```javascript
invoice.render('#invoice-container');
```

#### `print()`
Open browser print dialog.

```javascript
invoice.print();
```

#### `download()`
Download invoice as PDF (requires html2pdf library).

```javascript
// Add to HTML head:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

invoice.download();
```

#### `addItem(description, quantity, unitPrice)`
Add an item to the invoice.

```javascript
invoice.addItem('Consulting Services', 1, 5000);
```

#### `clearItems()`
Clear all items from the invoice.

```javascript
invoice.clearItems();
```

#### `setData(key, value)`
Update invoice data.

```javascript
invoice.setData('clientName', 'New Client Name');
```

## 💡 Usage Examples

### Example 1: Complete Invoice

```javascript
const invoice = new InvoiceGenerator({
  invoiceNumber: 'INV-2026-00050',
  issueDate: 'April 7, 2026',
  dueDate: 'May 7, 2026',
  clientName: 'TechStartup Inc.',
  contactPerson: 'Sarah Johnson',
  items: [
    { description: 'Enterprise Plan (12 months)', quantity: 1, unitPrice: 12000 },
    { description: 'Implementation & Training', quantity: 40, unitPrice: 200 },
    { description: 'API Integration Setup', quantity: 1, unitPrice: 2500 }
  ],
  taxRate: 0.08,
  status: 'PENDING',
  currency: '$'
});

invoice.render('#invoice');
```

### Example 2: Multiple Invoices

```javascript
const invoices = [
  { invoiceNumber: 'INV-001', clientName: 'Client A', status: 'PAID' },
  { invoiceNumber: 'INV-002', clientName: 'Client B', status: 'PENDING' },
  { invoiceNumber: 'INV-003', clientName: 'Client C', status: 'OVERDUE' }
];

invoices.forEach((data, index) => {
  const invoice = new InvoiceGenerator(data);
  invoice.render(`#invoice-${index}`);
});
```

### Example 3: Backend Integration (Node.js)

```javascript
// In your Express/NestJS backend
app.post('/api/invoices/:id/generate', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  
  const invoiceData = {
    invoiceNumber: invoice.number,
    issueDate: invoice.issuedAt,
    dueDate: invoice.dueDate,
    clientName: invoice.client.name,
    items: invoice.items,
    taxRate: invoice.taxRate,
    status: invoice.status
  };

  res.json(invoiceData);
});
```

```html
<!-- Frontend -->
<script>
  fetch(`/api/invoices/123/generate`)
    .then(res => res.json())
    .then(data => {
      const invoice = new InvoiceGenerator(data);
      invoice.render('#invoice-container');
    });
</script>
```

## 🖨️ Printing & PDF Export

### Print to Physical Printer

```javascript
invoice.print(); // Opens browser print dialog
```

### Export to PDF

```html
<!-- Add html2pdf library to your HTML -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

```javascript
invoice.download(); // Downloads as invoice-INV-2026-00042.pdf
```

### Print Styles
- Automatically removes shadows and borders
- Optimized for A4 paper (210mm × 297mm)
- Proper margins (10mm all sides)
- High contrast for printing

## 🎨 Customization

### Change Colors

Edit the CSS variables in the `<style>` section:

```css
:root {
  --primary-color: #4F46E5;    /* Main brand color */
  --accent-success: #10B981;   /* Green for PAID */
  --accent-warning: #F59E0B;   /* Orange for PENDING */
  --accent-danger: #EF4444;    /* Red for OVERDUE */
}
```

### Update Logo

Replace the SVG logo in the `renderLogoSVG()` method or use an image:

```javascript
// In invoice-generator.js, modify renderLogoSVG():
renderLogoSVG() {
  return `<img src="/path/to/taskflow-logo.png" alt="TaskFlow Logo" class="logo">`;
}
```

### Change Default Values

```javascript
const invoice = new InvoiceGenerator({
  companyName: 'Your Company',
  companyAddress: 'Your Address',
  taxRate: 0.19, // For different countries
  currency: '€'  // Or any currency symbol
});
```

## 📱 Responsive Behavior

### Desktop (900px+)
- Two-column layout (Items table + Summary)
- Full-sized table with 4 columns
- Side-by-side client info and items

### Tablet/Mobile (<768px)
- Single column layout
- Simplified table (3 columns)
- Stacked sections
- Optimized for mobile viewing

## 🔒 Security

- **XSS Protection**: All user inputs are escaped
- **No External Dependencies**: Core functionality works offline
- **Secure Printing**: Uses native browser print API
- **GDPR Compliant**: No data is sent to external servers

## ⚙️ Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🌙 Dark Mode

Dark mode is automatically activated based on system preferences:

```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles applied */
}
```

Users can also toggle via:
```css
/* Force dark mode */
html { color-scheme: dark; }

/* Force light mode */
html { color-scheme: light; }
```

## 🚀 Integration with TaskFlow Platform

### React Component Example

```jsx
import InvoiceGenerator from './invoice-generator';

export function InvoiceView({ invoiceId }) {
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    fetchInvoice(invoiceId).then(data => {
      const generator = new InvoiceGenerator(data);
      generator.render('#invoice-container');
    });
  }, [invoiceId]);

  return (
    <div>
      <div id="invoice-container"></div>
      <button onClick={() => window.print()}>Print</button>
    </div>
  );
}
```

### Angular Integration

```typescript
import { Component, OnInit } from '@angular/core';
import { InvoiceService } from './invoice.service';

@Component({
  selector: 'app-invoice',
  template: `<div id="invoice-container"></div>`
})
export class InvoiceComponent implements OnInit {
  constructor(private invoiceService: InvoiceService) {}

  ngOnInit() {
    this.invoiceService.get('123').subscribe(data => {
      const generator = new InvoiceGenerator(data);
      generator.render('#invoice-container');
    });
  }

  print() {
    window.print();
  }
}
```

## 📝 License

© 2026 TaskFlow Inc. All rights reserved.

## 🤝 Support

For issues or customization needs, contact: support@taskflow.com

---

**Version**: 1.0  
**Last Updated**: April 7, 2026  
**Designed for**: TaskFlow Business Management Platform
