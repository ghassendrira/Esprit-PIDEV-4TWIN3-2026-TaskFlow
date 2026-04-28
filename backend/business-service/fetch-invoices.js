const http = require('http');

const businessId = '70753564-8580-4a34-89af-0916d5dd6153';
const clientId = '45a40b46-a4cf-4edc-9983-7b98d65ce79f';

http.get(`http://localhost:3005/invoices/by-business/${businessId}`, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const invoices = JSON.parse(data);
      const clientInvoices = invoices.filter(inv => inv.clientId === clientId);
      console.log(JSON.stringify(clientInvoices, null, 2));
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.log('Raw data start:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
