const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function lock() {
  try {
    const lockUntil = new Date(Date.now() + 60 * 60 * 1000); // Bloqué pour 1 heure
    const user = await prisma.user.update({
      where: { email: 'houdakbaili@gmail.com' },
      data: {
        failedLoginAttempts: 10,
        lockUntil: lockUntil
      }
    });
    console.log('--- SUCCÈS ---');
    console.log('Le compte ' + user.email + ' a été REVERROUILLÉ.');
    console.log('Status: 403 Forbidden activé.');
  } catch (e) {
    console.error('--- ERREUR ---');
    console.log('Utilisateur non trouvé ou erreur de base de données.');
  } finally {
    await prisma.$disconnect();
  }
}

lock();
