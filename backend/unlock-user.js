const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unlock() {
  try {
    const user = await prisma.user.update({
      where: { email: 'houdakbaili@gmail.com' },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null
      }
    });
    console.log('--- SUCCÈS ---');
    console.log('Le compte ' + user.email + ' a été débloqué.');
    console.log('Vous pouvez maintenant vous reconnecter.');
  } catch (e) {
    console.error('--- ERREUR ---');
    console.log('Utilisateur non trouvé ou erreur de base de données.');
  } finally {
    await prisma.$disconnect();
  }
}

unlock();
