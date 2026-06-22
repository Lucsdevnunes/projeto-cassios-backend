import { Perfil } from '@prisma/client';
import { prisma } from './client';
import * as bcrypt from 'bcrypt';

async function main() {
  console.log('Seeding database...');

  // Check if admin user already exists
  const existingAdmin = await prisma.usuario.findFirst({
    where: { email: 'admin@sistema.com' },
  });

  if (!existingAdmin) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await prisma.usuario.create({
      data: {
        nome: 'Administrador Cassios',
        email: 'admin@sistema.com',
        senhaHash: adminPasswordHash,
        perfil: Perfil.ADMIN,
        ativo: true,
      },
    });
    console.log('Admin user created (admin@sistema.com / admin123)');
  } else {
    console.log('Admin user already exists');
  }

  // Check if technician user already exists
  const existingTecnico = await prisma.usuario.findFirst({
    where: { email: 'tecnico@sistema.com' },
  });

  if (!existingTecnico) {
    const tecnicoPasswordHash = await bcrypt.hash('tecnico123', 10);
    await prisma.usuario.create({
      data: {
        nome: 'Técnico Cassios',
        email: 'tecnico@sistema.com',
        senhaHash: tecnicoPasswordHash,
        perfil: Perfil.TECNICO,
        ativo: true,
      },
    });
    console.log('Technician user created (tecnico@sistema.com / tecnico123)');
  } else {
    console.log('Technician user already exists');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
