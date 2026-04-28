
const { AiService } = require('./dist/src/ai/ai.service');

async function inspectScenarios() {
  const aiService = new AiService();
  
  const scenarios = [
    {
      name: 'User Case (Real DB data for Borderline Low)',
      request: {
        businessId: '70753564-8580-4a34-89af-0916d5dd6153',
        clientId: '45a40b46-a4cf-4edc-9983-7b98d65ce79f',
        amount: 4930,
        dueDays: 30
      }
    },
    {
      name: 'High Amount, No history',
      request: {
        amount: 124500000,
        dueDays: 30,
        clientLateRatio: 0,
        previousLateCount: 0,
        openInvoiceCount: 0,
        overdueInvoiceCount: 0
      }
    },
    {
      name: 'Small Amount, No history',
      request: {
        amount: 1000,
        dueDays: 30,
        clientLateRatio: 0,
        previousLateCount: 0,
        openInvoiceCount: 0,
        overdueInvoiceCount: 0
      }
    },
    {
      name: 'Small Amount, 1 Overdue, No history',
      request: {
        amount: 1000,
        dueDays: 30,
        clientLateRatio: 0,
        previousLateCount: 0,
        openInvoiceCount: 1,
        overdueInvoiceCount: 1
      }
    }
  ];

  console.log('--- Model Inspection ---');
  const snapshot = aiService.getInvoiceDelaySnapshot();
  console.log(`Weights: ${JSON.stringify(snapshot.weights)}`);
  console.log(`Means: ${JSON.stringify(snapshot.means)}`);
  console.log(`Stds: ${JSON.stringify(snapshot.stds)}`);
  console.log(`Intercept: ${snapshot.intercept}`);

  for (const scenario of scenarios) {
    const result = await aiService.predictInvoiceDelay(scenario.request);
    console.log(`\nScenario: ${scenario.name}`);
    console.log(`Input Features: ${JSON.stringify(result.input)}`);
    console.log(`Probability: ${(result.riskProbability * 100).toFixed(1)}%`);
    console.log(`Level: ${result.riskLevel}`);
  }
}

inspectScenarios().catch(console.error);
