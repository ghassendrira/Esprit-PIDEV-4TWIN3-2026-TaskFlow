
const { INVOICE_DELAY_DATASET } = require('./dist/src/ai/invoice-delay.dataset');

const lateCount = INVOICE_DELAY_DATASET.filter(ex => ex.late).length;
const totalCount = INVOICE_DELAY_DATASET.length;
console.log(`Total examples: ${totalCount}`);
console.log(`Late examples: ${lateCount} (${(lateCount/totalCount*100).toFixed(1)}%)`);
console.log(`On-time examples: ${totalCount - lateCount} (${((totalCount - lateCount)/totalCount*100).toFixed(1)}%)`);
