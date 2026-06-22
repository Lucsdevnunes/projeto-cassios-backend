const { prisma } = require('./prisma/client');

async function checkMaintenance() {
  try {
    const maintenances = await prisma.manutencao.findMany({
      include: {
        fotos: true
      }
    });
    console.log('Maintenances in DB:', JSON.stringify(maintenances, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkMaintenance();
