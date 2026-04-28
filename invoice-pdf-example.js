/**
 * Exemple d'utilisation de l'endpoint /notification/invoice-pdf
 * pour générer et télécharger un PDF d'invoice
 */

const exampleInvoiceData = {
  invoiceNumber: 'INV-2026-00042',
  issueDate: 'April 7, 2026',
  dueDate: 'May 7, 2026',
  businessName: 'TaskFlow Inc.',
  businessAddress: '123 Business Street, San Francisco, CA 94102',
  businessPhone: '+1 (555) 123-4567',
  clientName: 'Acme Corporation',
  clientEmail: 'john.smith@acme.com',
  clientAddress: '456 Enterprise Ave, New York, NY 10001',
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
  subtotal: 5000,
  taxRate: 0.08,
  taxAmount: 400,
  totalAmount: 5400,
  notes: 'Thank you for your business! Payment is due within 30 days.',
  status: 'PENDING',
  currency: '$'
};

// Exemple de requête cURL
const curlExample = `
curl -X POST http://localhost:3000/notification/invoice-pdf \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(exampleInvoiceData, null, 2)}' \\
  --output invoice-INV-2026-00042.pdf
`;

// Exemple JavaScript (frontend)
const downloadInvoicePdf = async (invoiceData) => {
  try {
    const response = await fetch('/notification/invoice-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    // Créer un blob et déclencher le téléchargement
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`invoice-\${invoiceData.invoiceNumber}.pdf\`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
  }
};

// Exemple d'utilisation
// downloadInvoicePdf(exampleInvoiceData);
