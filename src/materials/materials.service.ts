import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.pecaMaterial.findMany({
      where: {
        ativo: true,
      },
      orderBy: [
        { categoria: 'asc' },
        { nome: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    return this.prisma.pecaMaterial.findUnique({
      where: { id },
    });
  }
}
