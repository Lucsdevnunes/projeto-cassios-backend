import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(usuarioId: string | null, acao: string, tabela: string, registroId: string, ip: string) {
    try {
      await this.prisma.auditoria.create({
        data: {
          usuarioId,
          acao,
          tabela,
          registroId,
          ip: ip || '127.0.0.1',
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  async findAll(filters: {
    page?: number;
    limit?: number;
    usuarioId?: string;
    acao?: string;
    tabela?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.usuarioId) {
      where.usuarioId = filters.usuarioId;
    }

    if (filters.acao) {
      where.acao = filters.acao;
    }

    if (filters.tabela) {
      where.tabela = filters.tabela;
    }

    if (filters.dataInicio || filters.dataFim) {
      where.dataHora = {};
      if (filters.dataInicio) {
        where.dataHora.gte = new Date(filters.dataInicio);
      }
      if (filters.dataFim) {
        where.dataHora.lte = new Date(filters.dataFim);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        include: {
          usuario: {
            select: { id: true, nome: true, email: true, perfil: true },
          },
        },
        orderBy: { dataHora: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
