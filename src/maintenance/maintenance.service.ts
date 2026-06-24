import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { MaintenanceResponseDto } from './dto/maintenance-response.dto';
import { TipoFoto } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private audit: AuditService,
  ) {}

  async create(createMaintenanceDto: CreateMaintenanceDto, executorId: string, ip: string): Promise<MaintenanceResponseDto> {
    const { equipamentoId, dataManutencao, servicoRealizado, descricao, pecaTrocada, quantidade, tecnicoNome, tecnicoAssinatura, contratanteNome, contratanteAssinatura, observacoes, fotosAntes, fotosDepois } = createMaintenanceDto;

    // 1. Verify equipment exists
    const equipment = await this.prisma.equipamento.findFirst({
      where: { id: equipamentoId, deletedAt: null },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado');
    }

    // 2. Upload signatures
    const tecnicoAssinaturaUrl = await this.storage.uploadBase64Image(tecnicoAssinatura, `sig-tech-${equipamentoId}`, 'assinaturas');
    const contratanteAssinaturaUrl = await this.storage.uploadBase64Image(contratanteAssinatura, `sig-client-${equipamentoId}`, 'assinaturas');

    // 3. Create Maintenance within a transaction to ensure integrity
    const maintenance = await this.prisma.$transaction(async (tx) => {
      const record = await tx.manutencao.create({
        data: {
          equipamentoId,
          dataManutencao: new Date(dataManutencao),
          servicoRealizado,
          descricao,
          pecaTrocada: pecaTrocada || null,
          quantidade: quantidade ?? 0,
          tecnicoNome,
          tecnicoAssinatura: tecnicoAssinaturaUrl,
          contratanteNome,
          contratanteAssinatura: contratanteAssinaturaUrl,
          observacoes: observacoes || null,
        },
      });

      await this.audit.log(executorId, 'UPLOAD_SIGNATURE_TECH', 'manutencoes', record.id, ip);
      await this.audit.log(executorId, 'UPLOAD_SIGNATURE_CLIENT', 'manutencoes', record.id, ip);

      // 4. Process and upload before photos (if any)
      if (fotosAntes && fotosAntes.length > 0) {
        for (const [index, base64Photo] of fotosAntes.entries()) {
          const photoUrl = await this.storage.uploadBase64Image(base64Photo, `photo-before-${record.id}-${index}`, 'fotos-antes');
          const photo = await tx.foto.create({
            data: {
              manutencaoId: record.id,
              tipo: TipoFoto.ANTES,
              arquivo: photoUrl,
            },
          });
          await this.audit.log(executorId, 'UPLOAD_PHOTO_BEFORE', 'fotos', photo.id, ip);
        }
      }

      // 5. Process and upload after photos (if any)
      if (fotosDepois && fotosDepois.length > 0) {
        for (const [index, base64Photo] of fotosDepois.entries()) {
          const photoUrl = await this.storage.uploadBase64Image(base64Photo, `photo-after-${record.id}-${index}`, 'fotos-depois');
          const photo = await tx.foto.create({
            data: {
              manutencaoId: record.id,
              tipo: TipoFoto.DEPOIS,
              arquivo: photoUrl,
            },
          });
          await this.audit.log(executorId, 'UPLOAD_PHOTO_AFTER', 'fotos', photo.id, ip);
        }
      }

      // Recalcular proximaManutencao no equipamento associado
      const freq = equipment.frequenciaManutencao || 6;
      const nextDate = new Date(dataManutencao);
      nextDate.setMonth(nextDate.getMonth() + freq);

      await tx.equipamento.update({
        where: { id: equipamentoId },
        data: { proximaManutencao: nextDate },
      });

      return record;
    });

    // 6. Log audit trail
    await this.audit.log(executorId, 'CREATE', 'manutencoes', maintenance.id, ip);

    // Return full maintenance record including photos
    const result = await this.prisma.manutencao.findUnique({
      where: { id: maintenance.id },
      include: { fotos: true },
    });
    return this.transformMaintenanceUrls(result);
  }

  async findAll(page?: number, limit?: number): Promise<MaintenanceResponseDto[]> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit ? limit : undefined;

    const records = await this.prisma.manutencao.findMany({
      where: { deletedAt: null },
      include: {
        equipamento: {
          select: { codigoInterno: true, marca: true, modelo: true, localInstalacao: true },
        },
        fotos: true,
      },
      orderBy: { dataManutencao: 'desc' },
      skip,
      take,
    });
    for (const r of records) {
      await this.transformMaintenanceUrls(r);
    }
    return records;
  }

  async findOne(id: string): Promise<MaintenanceResponseDto> {
    const maintenance = await this.prisma.manutencao.findFirst({
      where: { id, deletedAt: null },
      include: {
        equipamento: true,
        fotos: true,
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Manutenção não encontrada');
    }

    return this.transformMaintenanceUrls(maintenance);
  }

  private async transformMaintenanceUrls(m: any) {
    if (!m) return m;
    m.tecnicoAssinatura = await this.storage.getPresignedUrl(m.tecnicoAssinatura);
    m.contratanteAssinatura = await this.storage.getPresignedUrl(m.contratanteAssinatura);
    if (m.fotos && m.fotos.length > 0) {
      for (const foto of m.fotos) {
        foto.arquivo = await this.storage.getPresignedUrl(foto.arquivo);
      }
    }
    return m;
  }

  async remove(id: string, executorId: string, ip: string) {
    const maintenance = await this.prisma.manutencao.findFirst({
      where: { id, deletedAt: null },
    });

    if (!maintenance) {
      throw new NotFoundException('Manutenção não encontrada');
    }

    await this.prisma.manutencao.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log(executorId, 'DELETE', 'manutencoes', id, ip);

    return { success: true, message: 'Manutenção excluída com sucesso' };
  }
}
