#!/usr/bin/env node

/**
 * Test script pour vérifier l'endpoint /notification/invoice-pdf
 * Lance le serveur et teste la génération de PDF
 */

const http = require('http');

const testData = {
  invoiceNumber: 'INV-2026-TEST-001',
  issueDate: 'April 7, 2026',
  dueDate: 'May 7, 2026',
  businessName: 'TaskFlow Inc.',
  businessAddress: '123 Business Street, San Francisco, CA 94102',
  businessPhone: '+1 (555) 123-4567',
  clientName: 'Test Company',
  clientEmail: 'test@company.com',
  clientAddress: '123 Test Street, Test City, TC 12345',
  items: [
    {
      description: 'Test Service - Monthly',
      quantity: 1,
      unitPrice: 1000
    },
    {
      description: 'Setup Fee',
      quantity: 1,
      unitPrice: 500
    }
  ],
  subtotal: 1500,
  taxRate: 0.08,
  taxAmount: 120,
  totalAmount: 1620,
  notes: 'Test invoice for PDF generation',
  status: 'PENDING',
  currency: '$'
};

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/notification/invoice-pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('🚀 Testing invoice PDF generation...');
console.log('📄 Sending test data to /notification/invoice-pdf');

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  if (res.statusCode === 200) {
    console.log('✅ PDF generated successfully!');
    console.log(`📏 Content-Length: ${res.headers['content-length']} bytes`);
    console.log(`📎 Content-Disposition: ${res.headers['content-disposition']}`);
  } else {
    console.log('❌ Error generating PDF');
  }

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.log('❌ Error response:', data);
    } else {
      console.log('✅ PDF data received successfully');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
  console.log('');
  console.log('💡 Make sure the notification-service is running:');
  console.log('   cd backend/notification-service');
  console.log('   npm run start:dev');
});

req.write(JSON.stringify(testData));
req.end();