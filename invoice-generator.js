/**
 * TaskFlow Invoice Generator
 * Modern, professional invoice template with light/dark mode support
 * 
 * Usage:
 * const invoice = new InvoiceGenerator(invoiceData);
 * invoice.render('#invoice-container');
 * invoice.print();
 */

class InvoiceGenerator {
  constructor(config = {}) {
    this.data = {
      invoiceNumber: config.invoiceNumber || 'INV-2026-00001',
      issueDate: config.issueDate || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      dueDate: config.dueDate || this.addDays(new Date(), 30).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      company: {
        name: config.companyName || 'TaskFlow Inc.',
        address: config.companyAddress || '123 Business Street',
        city: config.companyCity || 'San Francisco, CA 94102',
        email: config.companyEmail || 'contact@taskflow.com',
        phone: config.companyPhone || '+1 (555) 123-4567'
      },
      client: {
        name: config.clientName || 'Acme Corporation',
        contactPerson: config.contactPerson || 'John Smith',
        title: config.contactTitle || 'Director of Operations',
        email: config.clientEmail || 'john.smith@acme.com',
        address: config.clientAddress || '456 Enterprise Ave',
        city: config.clientCity || 'New York, NY 10001'
      },
      items: config.items || [],
      taxRate: config.taxRate || 0.08,
      status: config.status || 'PENDING', // PENDING, PAID, OVERDUE
      notes: config.notes || 'Thank you for your business! Payment is due within 30 days of invoice date.',
      paymentInstructions: config.paymentInstructions || {
        bankTransfer: 'Bank Transfer: Account #123456789 | Routing #987654321',
        creditCard: 'Credit Card: Available via payment portal'
      },
      currency: config.currency || '$'
    };
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  calculateTotals() {
    const subtotal = this.data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const tax = subtotal * this.data.taxRate;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  getStatusCSS() {
    const statusMap = {
      'PAID': 'status-paid',
      'PENDING': 'status-pending',
      'OVERDUE': 'status-overdue'
    };
    return statusMap[this.data.status] || 'status-pending';
  }

  renderLogoSVG() {
    return `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 120' style='width: 140px; height: auto;'>
        <defs>
          <linearGradient id='grad1' x1='0%' y1='0%' x2='100%' y2='100%'>
            <stop offset='0%' style='stop-color:#4F46E5;stop-opacity:1' />
            <stop offset='100%' style='stop-color:#06B6D4;stop-opacity:1' />
          </linearGradient>
        </defs>
        <!-- Logo Icon -->
        <rect x='20' y='25' width='50' height='50' rx='4' fill='#334155' opacity='0.3'/>
        <text x='32' y='45' font-size='24' font-weight='bold' fill='#4F46E5'>✓</text>
        <!-- Text -->
        <text x='85' y='55' font-size='42' font-weight='bold' font-family='Arial, sans-serif' fill='#0F172A'>TaskFlow</text>
        <!-- Underline -->
        <line x1='85' y1='65' x2='360' y2='65' stroke='url(#grad1)' stroke-width='3' stroke-linecap='round'/>
      </svg>
    `;
  }

  renderItemsTable() {
    return `
      <div class="items-table">
        <div class="table-header">
          <div>Description</div>
          <div class="table-number">Qty</div>
          <div class="table-price">Unit Price</div>
          <div class="table-price">Total</div>
        </div>
        ${this.data.items.map(item => `
          <div class="table-row">
            <div class="item-description">${item.description}</div>
            <div class="table-number">${item.quantity}</div>
            <div class="table-price">${this.data.currency}${item.unitPrice.toFixed(2)}</div>
            <div class="table-price">${this.data.currency}${(item.unitPrice * item.quantity).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  render(containerId) {
    const container = document.querySelector(containerId);
    if (!container) {
      console.error(`Container with selector "${containerId}" not found`);
      return;
    }

    const { subtotal, tax, total } = this.calculateTotals();
    const statusCSS = this.getStatusCSS();

    const html = `
      <div class="invoice-container">
        <!-- HEADER -->
        <div class="header">
          <div class="logo-section">
            ${this.renderLogoSVG()}
            <div class="company-info">
              <div class="company-name">${this.data.company.name}</div>
              <p>${this.data.company.address}</p>
              <p>${this.data.company.city}</p>
              <p>${this.data.company.email}</p>
              <p>${this.data.company.phone}</p>
            </div>
          </div>

          <div class="invoice-title-section">
            <h1 class="invoice-title">INVOICE</h1>
            <p class="invoice-number">Invoice #${this.data.invoiceNumber}</p>
          </div>
        </div>

        <!-- INVOICE DETAILS -->
        <div class="invoice-details">
          <div class="detail-group">
            <span class="detail-label">Issue Date</span>
            <span class="detail-value">${this.data.issueDate}</span>
          </div>
          <div class="detail-group">
            <span class="detail-label">Due Date</span>
            <span class="detail-value">${this.data.dueDate}</span>
          </div>
          <div class="detail-group">
            <span class="detail-label">Invoice Amount</span>
            <span class="detail-value">${this.data.currency}${total.toFixed(2)}</span>
          </div>
        </div>

        <!-- MAIN CONTENT -->
        <div class="main-content">
          <!-- LEFT COLUMN -->
          <div class="left-column">
            <!-- CLIENT INFORMATION -->
            <div>
              <div class="section-title">Bill To</div>
              <div class="client-info">
                <div class="client-name">${this.data.client.name}</div>
                <div class="client-detail">
                  ${this.data.client.contactPerson}<br>
                  ${this.data.client.title}<br>
                  ${this.data.client.email}<br>
                  ${this.data.client.address}<br>
                  ${this.data.client.city}
                </div>
              </div>
            </div>

            <!-- ITEMS TABLE -->
            <div>
              <div class="section-title">Items & Services</div>
              ${this.renderItemsTable()}
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div class="right-column">
            <!-- SUMMARY BOX -->
            <div class="summary-box">
              <div class="section-title">Summary</div>
              <div class="summary-section">
                <div class="summary-row">
                  <span class="summary-label">Subtotal</span>
                  <span class="summary-value">${this.data.currency}${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Tax (${(this.data.taxRate * 100).toFixed(0)}% - TVA)</span>
                  <span class="summary-value">${this.data.currency}${tax.toFixed(2)}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-total">
                  <span>Total Due</span>
                  <span>${this.data.currency}${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <!-- STATUS BADGE -->
            <div class="status-section">
              <div class="status-label">Payment Status</div>
              <span class="status-badge ${statusCSS}">${this.data.status}</span>
            </div>

            <!-- NOTES -->
            <div>
              <div class="section-title">Notes</div>
              <p style="font-size: 13px; line-height: 1.6; margin: 0;">
                ${this.data.notes}
              </p>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
          <div class="thank-you">✨ Thank you for choosing TaskFlow!</div>
          <div class="footer-section">
            <div class="footer-title">Payment Instructions</div>
            <p>${this.data.paymentInstructions.bankTransfer}</p>
            <p>${this.data.paymentInstructions.creditCard}</p>
          </div>
          <div style="font-size: 11px; margin-top: 16px;">
            © 2026 TaskFlow Inc. All rights reserved. | www.taskflow.com
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  print() {
    window.print();
  }

  download() {
    const element = document.querySelector('.invoice-container');
    if (!element) {
      console.error('Invoice container not found');
      return;
    }

    const opt = {
      margin: 10,
      filename: `invoice-${this.data.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    // Requires html2pdf library: <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    if (typeof html2pdf !== 'undefined') {
      html2pdf().set(opt).from(element).save();
    } else {
      console.warn('html2pdf library not loaded. Please include it in your HTML.');
    }
  }

  // Set custom data
  setData(key, value) {
    this.data[key] = value;
  }

  addItem(description, quantity, unitPrice) {
    this.data.items.push({ description, quantity, unitPrice });
  }

  clearItems() {
    this.data.items = [];
  }
}

// Example usage:
// const invoice = new InvoiceGenerator({
//   invoiceNumber: 'INV-2026-00042',
//   issueDate: 'April 7, 2026',
//   dueDate: 'May 7, 2026',
//   clientName: 'Acme Corporation',
//   items: [
//     { description: 'TaskFlow Pro - Annual Subscription', quantity: 1, unitPrice: 3600 },
//     { description: 'Premium Support Package (12 months)', quantity: 1, unitPrice: 1200 },
//     { description: 'Custom Integration Setup', quantity: 1, unitPrice: 600 }
//   ],
//   taxRate: 0.08,
//   status: 'PENDING'
// });
// invoice.render('#invoice-container');
