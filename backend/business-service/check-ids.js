
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    const business = await prisma.business.findFirst({
      where: { name: 'Nova Ledger Logistics' }
    });
    
    if (business) {
      console.log('BUSINESS_ID=' + business.id);
      const client = await prisma.client.findFirst({
        where: { 
          businessId: business.id,
          name: 'Nova Ledger Borderline Low'
        }
      });
      if (client) {
        console.log('CLIENT_ID=' + client.id);
      } else {
        console.log('Client not found');
      }
    } else {
      console.log('Business not found');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
