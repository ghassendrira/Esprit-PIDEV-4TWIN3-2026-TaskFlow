const http = require('http');

const businessId = '70753564-8580-4a34-89af-0916d5dd6153';
const clientId = '45a40b46-a4cf-4edc-9983-7b98d65ce79f';

const data = JSON.stringify({
  businessId,
  clientId
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/ai/invoice-delay/predict',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(body);
      console.log('Prediction Response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Raw body:', body);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
