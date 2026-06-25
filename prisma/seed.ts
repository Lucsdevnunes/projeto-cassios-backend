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

  // Seed peças e materiais
  const materiais = [
    // Compressores
    { nome: 'Compressor Rotativo', categoria: 'Compressores', unidade: 'UN' },
    { nome: 'Compressor Scroll', categoria: 'Compressores', unidade: 'UN' },
    { nome: 'Compressor Inverter', categoria: 'Compressores', unidade: 'UN' },
    // Capacitores
    { nome: 'Capacitor de Partida 25uF', categoria: 'Capacitores', unidade: 'UN' },
    { nome: 'Capacitor de Partida 30uF', categoria: 'Capacitores', unidade: 'UN' },
    { nome: 'Capacitor de Partida 35uF', categoria: 'Capacitores', unidade: 'UN' },
    { nome: 'Capacitor de Partida 40uF', categoria: 'Capacitores', unidade: 'UN' },
    { nome: 'Capacitor Permanente 2,5uF', categoria: 'Capacitores', unidade: 'UN' },
    { nome: 'Capacitor Permanente 5uF', categoria: 'Capacitores', unidade: 'UN' },
    { nome: 'Capacitor Permanente 7,5uF', categoria: 'Capacitores', unidade: 'UN' },
    { nome: 'Capacitor Permanente 10uF', categoria: 'Capacitores', unidade: 'UN' },
    // Sensores
    { nome: 'Sensor Ambiente', categoria: 'Sensores', unidade: 'UN' },
    { nome: 'Sensor Serpentina', categoria: 'Sensores', unidade: 'UN' },
    { nome: 'Sensor Degelo', categoria: 'Sensores', unidade: 'UN' },
    { nome: 'Sensor Descarga', categoria: 'Sensores', unidade: 'UN' },
    { nome: 'Sensor Condensadora', categoria: 'Sensores', unidade: 'UN' },
    // Placas Eletrônicas
    { nome: 'Placa Principal Evaporadora', categoria: 'Placas Eletrônicas', unidade: 'UN' },
    { nome: 'Placa Principal Condensadora', categoria: 'Placas Eletrônicas', unidade: 'UN' },
    { nome: 'Placa Inverter', categoria: 'Placas Eletrônicas', unidade: 'UN' },
    { nome: 'Display Digital', categoria: 'Placas Eletrônicas', unidade: 'UN' },
    { nome: 'Receptor Infravermelho', categoria: 'Placas Eletrônicas', unidade: 'UN' },
    // Motores
    { nome: 'Motor Ventilador Evaporadora', categoria: 'Motores', unidade: 'UN' },
    { nome: 'Motor Ventilador Condensadora', categoria: 'Motores', unidade: 'UN' },
    { nome: 'Motor Swing Horizontal', categoria: 'Motores', unidade: 'UN' },
    { nome: 'Motor Swing Vertical', categoria: 'Motores', unidade: 'UN' },
    // Ventilação
    { nome: 'Hélice Condensadora', categoria: 'Ventilação', unidade: 'UN' },
    { nome: 'Turbina Evaporadora', categoria: 'Ventilação', unidade: 'UN' },
    { nome: 'Grade de Proteção', categoria: 'Ventilação', unidade: 'UN' },
    // Sistema Frigorífico
    { nome: 'Filtro Secador', categoria: 'Sistema Frigorífico', unidade: 'UN' },
    { nome: 'Válvula Reversora', categoria: 'Sistema Frigorífico', unidade: 'UN' },
    { nome: 'Válvula de Expansão', categoria: 'Sistema Frigorífico', unidade: 'UN' },
    { nome: 'Capilar', categoria: 'Sistema Frigorífico', unidade: 'M' },
    { nome: 'Acumulador de Sucção', categoria: 'Sistema Frigorífico', unidade: 'UN' },
    { nome: 'Separador de Óleo', categoria: 'Sistema Frigorífico', unidade: 'UN' },
    // Controles Elétricos
    { nome: 'Contator', categoria: 'Controles Elétricos', unidade: 'UN' },
    { nome: 'Relé', categoria: 'Controles Elétricos', unidade: 'UN' },
    { nome: 'Fusível', categoria: 'Controles Elétricos', unidade: 'UN' },
    { nome: 'Disjuntor', categoria: 'Controles Elétricos', unidade: 'UN' },
    { nome: 'Termostato', categoria: 'Controles Elétricos', unidade: 'UN' },
    { nome: 'Pressostato Alta', categoria: 'Controles Elétricos', unidade: 'UN' },
    { nome: 'Pressostato Baixa', categoria: 'Controles Elétricos', unidade: 'UN' },
    // Tubulações de Cobre
    { nome: 'Tubo de Cobre 1/4', categoria: 'Tubulações de Cobre', unidade: 'M' },
    { nome: 'Tubo de Cobre 3/8', categoria: 'Tubulações de Cobre', unidade: 'M' },
    { nome: 'Tubo de Cobre 1/2', categoria: 'Tubulações de Cobre', unidade: 'M' },
    { nome: 'Tubo de Cobre 5/8', categoria: 'Tubulações de Cobre', unidade: 'M' },
    { nome: 'Tubo de Cobre 3/4', categoria: 'Tubulações de Cobre', unidade: 'M' },
    { nome: 'Tubo de Cobre 7/8', categoria: 'Tubulações de Cobre', unidade: 'M' },
    // Drenagem
    { nome: 'Mangueira de Dreno 1/2', categoria: 'Drenagem', unidade: 'M' },
    { nome: 'Mangueira de Dreno 3/4', categoria: 'Drenagem', unidade: 'M' },
    { nome: 'Bomba de Dreno', categoria: 'Drenagem', unidade: 'UN' },
    { nome: 'Bandeja de Condensado', categoria: 'Drenagem', unidade: 'UN' },
    // Cabos e Elétrica
    { nome: 'Cabo PP 2x1,5', categoria: 'Cabos e Elétrica', unidade: 'M' },
    { nome: 'Cabo PP 3x1,5', categoria: 'Cabos e Elétrica', unidade: 'M' },
    { nome: 'Cabo PP 3x2,5', categoria: 'Cabos e Elétrica', unidade: 'M' },
    { nome: 'Cabo PP 4x2,5', categoria: 'Cabos e Elétrica', unidade: 'M' },
    { nome: 'Cabo Flexível 1,5mm²', categoria: 'Cabos e Elétrica', unidade: 'M' },
    { nome: 'Cabo Flexível 2,5mm²', categoria: 'Cabos e Elétrica', unidade: 'M' },
    { nome: 'Cabo Flexível 4mm²', categoria: 'Cabos e Elétrica', unidade: 'M' },
    { nome: 'Terminal Elétrico', categoria: 'Cabos e Elétrica', unidade: 'UN' },
    { nome: 'Conector Wago', categoria: 'Cabos e Elétrica', unidade: 'UN' },
    { nome: 'Abraçadeira Nylon', categoria: 'Cabos e Elétrica', unidade: 'UN' },
    // Isolamento
    { nome: 'Isolamento Elastomérico 1/4', categoria: 'Isolamento', unidade: 'M' },
    { nome: 'Isolamento Elastomérico 3/8', categoria: 'Isolamento', unidade: 'M' },
    { nome: 'Isolamento Elastomérico 1/2', categoria: 'Isolamento', unidade: 'M' },
    { nome: 'Isolamento Elastomérico 5/8', categoria: 'Isolamento', unidade: 'M' },
    // Fixação
    { nome: 'Bucha Nº 6', categoria: 'Fixação', unidade: 'UN' },
    { nome: 'Bucha Nº 8', categoria: 'Fixação', unidade: 'UN' },
    { nome: 'Bucha Nº 10', categoria: 'Fixação', unidade: 'UN' },
    { nome: 'Parafuso Sextavado', categoria: 'Fixação', unidade: 'UN' },
    { nome: 'Parafuso Phillips', categoria: 'Fixação', unidade: 'UN' },
    { nome: 'Chumbador', categoria: 'Fixação', unidade: 'UN' },
    { nome: 'Suporte para Condensadora', categoria: 'Fixação', unidade: 'UN' },
    // Acabamento
    { nome: 'Canaleta 20x10', categoria: 'Acabamento', unidade: 'M' },
    { nome: 'Canaleta 30x30', categoria: 'Acabamento', unidade: 'M' },
    { nome: 'Canaleta 50x50', categoria: 'Acabamento', unidade: 'M' },
    { nome: 'Curva para Canaleta', categoria: 'Acabamento', unidade: 'UN' },
    { nome: 'Emenda para Canaleta', categoria: 'Acabamento', unidade: 'UN' },
    { nome: 'Tampa Terminal Canaleta', categoria: 'Acabamento', unidade: 'UN' },
    { nome: 'Fita PVC', categoria: 'Acabamento', unidade: 'M' },
    { nome: 'Fita Isolante', categoria: 'Acabamento', unidade: 'M' },
    // Filtros
    { nome: 'Filtro de Ar Evaporadora', categoria: 'Filtros', unidade: 'UN' },
    { nome: 'Filtro Lavável', categoria: 'Filtros', unidade: 'UN' },
    { nome: 'Tela Filtrante', categoria: 'Filtros', unidade: 'UN' },
    // Gases Refrigerantes
    { nome: 'Gás R22', categoria: 'Gases Refrigerantes', unidade: 'KG' },
    { nome: 'Gás R410A', categoria: 'Gases Refrigerantes', unidade: 'KG' },
    { nome: 'Gás R32', categoria: 'Gases Refrigerantes', unidade: 'KG' },
    { nome: 'Gás R134A', categoria: 'Gases Refrigerantes', unidade: 'KG' },
    { nome: 'Gás R404A', categoria: 'Gases Refrigerantes', unidade: 'KG' },
    { nome: 'Gás R407C', categoria: 'Gases Refrigerantes', unidade: 'KG' },
    { nome: 'Gás R454B', categoria: 'Gases Refrigerantes', unidade: 'KG' },
    // Produtos Químicos
    { nome: 'Limpa Serpentina', categoria: 'Produtos Químicos', unidade: 'L' },
    { nome: 'Desengraxante', categoria: 'Produtos Químicos', unidade: 'L' },
    { nome: 'Bactericida', categoria: 'Produtos Químicos', unidade: 'L' },
    { nome: 'Sanitizante', categoria: 'Produtos Químicos', unidade: 'L' },
    { nome: 'Removedor de Oxidação', categoria: 'Produtos Químicos', unidade: 'L' },
    // Consumíveis
    { nome: 'Solda Prata', categoria: 'Consumíveis', unidade: 'M' },
    { nome: 'Solda Foscoper', categoria: 'Consumíveis', unidade: 'M' },
    { nome: 'Fluxo para Solda', categoria: 'Consumíveis', unidade: 'L' },
    { nome: 'Nitrogênio', categoria: 'Consumíveis', unidade: 'KG' },
    { nome: 'Válvula Schrader', categoria: 'Consumíveis', unidade: 'UN' },
    { nome: 'Tampa Schrader', categoria: 'Consumíveis', unidade: 'UN' },
    { nome: 'Núcleo Schrader', categoria: 'Consumíveis', unidade: 'UN' }
  ];

  console.log(`Seeding ${materiais.length} materials...`);
  for (const mat of materiais) {
    await prisma.pecaMaterial.upsert({
      where: { nome: mat.nome },
      update: { categoria: mat.categoria, unidade: mat.unidade, ativo: true },
      create: { nome: mat.nome, categoria: mat.categoria, unidade: mat.unidade, ativo: true }
    });
  }
  console.log('Materials seeding completed.');

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
