import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentResponseDto } from './dto/equipment-response.dto';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';

@Injectable()
export class EquipmentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private storage: StorageService,
  ) {}

  async create(createEquipmentDto: CreateEquipmentDto, executorId: string, ip: string): Promise<EquipmentResponseDto> {
    const { codigoInterno, clienteId } = createEquipmentDto;

    // Enforce uniqueness of code
    const existing = await this.prisma.equipamento.findFirst({
      where: { codigoInterno, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Já existe um equipamento cadastrado com este código interno');
    }

    const uuid = uuidv4();
    let qrCodeUrl: string | null = null;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const publicUrl = `${frontendUrl}/equipamento?id=${uuid}`;

    try {
      const qrCodeBuffer = await QRCode.toBuffer(publicUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
      });
      qrCodeUrl = await this.storage.uploadFile(
        qrCodeBuffer,
        `qrcode-eq-${uuid}.png`,
        'image/png',
        'qrcodes',
      );
    } catch (err) {
      console.error('Failed to generate and upload QR Code image', err);
      throw new Error('Erro ao gerar imagem do QR Code');
    }

    const frequencia = createEquipmentDto.frequenciaManutencao ?? 6;
    let proxima = createEquipmentDto.proximaManutencao ? new Date(createEquipmentDto.proximaManutencao) : null;
    if (!proxima) {
      const baseDate = new Date(createEquipmentDto.dataInstalacao);
      baseDate.setMonth(baseDate.getMonth() + frequencia);
      proxima = baseDate;
    }

    const equipment = await this.prisma.equipamento.create({
      data: {
        id: uuid,
        codigoInterno,
        qrCode: qrCodeUrl,
        endereco: createEquipmentDto.endereco,
        localInstalacao: createEquipmentDto.localInstalacao,
        marca: createEquipmentDto.marca,
        modelo: createEquipmentDto.modelo,
        numeroSerie: createEquipmentDto.numeroSerie,
        btu: createEquipmentDto.btu,
        tipo: createEquipmentDto.tipo,
        dataInstalacao: createEquipmentDto.dataInstalacao,
        observacoes: createEquipmentDto.observacoes,
        criadoPor: executorId,
        clienteId: clienteId || null,
        frequenciaManutencao: frequencia,
        proximaManutencao: proxima,
      },
    });

    await this.audit.log(executorId, 'CREATE', 'equipamentos', equipment.id, ip);
    if (qrCodeUrl) {
      await this.audit.log(executorId, 'GENERATE_QRCODE', 'equipamentos', equipment.id, ip);
    }

    return equipment;
  }

  async findAll(page?: number, limit?: number): Promise<EquipmentResponseDto[]> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit ? limit : undefined;

    const equipments = await this.prisma.equipamento.findMany({
      where: { deletedAt: null },
      include: {
        criador: {
          select: { nome: true, email: true },
        },
        cliente: {
          select: { nome: true, qrCode: true },
        },
      },
      orderBy: { criadoEm: 'desc' },
      skip,
      take,
    });

    for (const eq of equipments) {
      if (eq.qrCode) {
        eq.qrCode = await this.storage.getPresignedUrl(eq.qrCode);
      }
      if (eq.cliente && eq.cliente.qrCode) {
        eq.cliente.qrCode = await this.storage.getPresignedUrl(eq.cliente.qrCode);
      }
    }

    return equipments;
  }

  async findOne(id: string): Promise<EquipmentResponseDto> {
    const equipment = await this.prisma.equipamento.findFirst({
      where: { id, deletedAt: null },
      include: {
        criador: {
          select: { nome: true, email: true },
        },
        cliente: true,
        manutencoes: {
          where: { deletedAt: null },
          include: {
            fotos: true,
          },
          orderBy: { dataManutencao: 'desc' }, // Descending for administrative listings
        },
      },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado');
    }

    // Lazy migration/generation of equipment QR code
    if (!equipment.qrCode || equipment.qrCode.startsWith('data:image/')) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const publicUrl = `${frontendUrl}/equipamento?id=${equipment.id}`;
      try {
        const qrCodeBuffer = await QRCode.toBuffer(publicUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 300,
        });
        const qrCodeUrl = await this.storage.uploadFile(
          qrCodeBuffer,
          `qrcode-eq-${equipment.id}.png`,
          'image/png',
          'qrcodes',
        );
        await this.prisma.equipamento.update({
          where: { id: equipment.id },
          data: { qrCode: qrCodeUrl },
        });
        equipment.qrCode = qrCodeUrl;
      } catch (err) {
        console.error('Failed to migrate/generate equipment QR code lazily', err);
      }
    }

    if (equipment.manutencoes && equipment.manutencoes.length > 0) {
      for (const m of equipment.manutencoes) {
        await this.transformMaintenanceUrls(m);
      }
    }

    // Generate presigned URL for QR code
    if (equipment.qrCode) {
      equipment.qrCode = await this.storage.getPresignedUrl(equipment.qrCode);
    }
    if (equipment.cliente && equipment.cliente.qrCode) {
      equipment.cliente.qrCode = await this.storage.getPresignedUrl(equipment.cliente.qrCode);
    }

    return equipment;
  }

  /**
   * Public search accessed via QR Code scan. Does not require login.
   * Returns details and timeline sorted chronologically.
   */
  async findOnePublic(id: string): Promise<EquipmentResponseDto> {
    const equipment = await this.prisma.equipamento.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        codigoInterno: true,
        qrCode: true,
        endereco: true,
        localInstalacao: true,
        marca: true,
        modelo: true,
        numeroSerie: true,
        btu: true,
        tipo: true,
        dataInstalacao: true,
        observacoes: true,
        criadoEm: true,
        clienteId: true,
        cliente: {
          select: { nome: true },
        },
        manutencoes: {
          where: { deletedAt: null },
          select: {
            id: true,
            dataManutencao: true,
            servicoRealizado: true,
            descricao: true,
            pecaTrocada: true,
            quantidade: true,
            tecnicoNome: true,
            tecnicoAssinatura: true,
            contratanteNome: true,
            contratanteAssinatura: true,
            observacoes: true,
            fotos: {
              select: {
                id: true,
                tipo: true,
                arquivo: true,
              },
            },
          },
          orderBy: { dataManutencao: 'asc' }, // Timeline in chronological order (asc)
        },
      },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado');
    }

    // Lazy migration/generation of equipment QR code
    if (!equipment.qrCode || equipment.qrCode.startsWith('data:image/')) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const publicUrl = `${frontendUrl}/equipamento?id=${equipment.id}`;
      try {
        const qrCodeBuffer = await QRCode.toBuffer(publicUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 300,
        });
        const qrCodeUrl = await this.storage.uploadFile(
          qrCodeBuffer,
          `qrcode-eq-${equipment.id}.png`,
          'image/png',
          'qrcodes',
        );
        await this.prisma.equipamento.update({
          where: { id: equipment.id },
          data: { qrCode: qrCodeUrl },
        });
        equipment.qrCode = qrCodeUrl;
      } catch (err) {
        console.error('Failed to migrate/generate equipment QR code lazily', err);
      }
    }

    if (equipment.manutencoes && equipment.manutencoes.length > 0) {
      for (const m of equipment.manutencoes) {
        await this.transformMaintenanceUrls(m);
      }
    }

    // Generate presigned URL for QR code
    if (equipment.qrCode) {
      equipment.qrCode = await this.storage.getPresignedUrl(equipment.qrCode);
    }

    return equipment;
  }

  async update(id: string, updateEquipmentDto: UpdateEquipmentDto, executorId: string, ip: string): Promise<EquipmentResponseDto> {
    const equipment = await this.prisma.equipamento.findFirst({
      where: { id, deletedAt: null },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado');
    }

    if (updateEquipmentDto.codigoInterno && updateEquipmentDto.codigoInterno !== equipment.codigoInterno) {
      const existingConflict = await this.prisma.equipamento.findFirst({
        where: { codigoInterno: updateEquipmentDto.codigoInterno, deletedAt: null },
      });
      if (existingConflict) {
        throw new ConflictException('Já existe um equipamento cadastrado com este código interno');
      }
    }

    // Determine QR Code changes based on Client linkage
    let qrCode = equipment.qrCode;
    
    // Check if the association changes
    if ('clienteId' in updateEquipmentDto) {
      const newClienteId = updateEquipmentDto.clienteId;
      if (newClienteId) {
        // Linked to establishment, remove individual QR Code
        qrCode = null;
      } else {
        // Independent now, generate individual QR Code if it doesn't have one or has a legacy base64 one
        if (!qrCode || qrCode.startsWith('data:image/')) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const publicUrl = `${frontendUrl}/equipamento?id=${id}`;
          try {
            const qrCodeBuffer = await QRCode.toBuffer(publicUrl, {
              errorCorrectionLevel: 'H',
              margin: 2,
              width: 300,
            });
            qrCode = await this.storage.uploadFile(
              qrCodeBuffer,
              `qrcode-eq-${id}.png`,
              'image/png',
              'qrcodes',
            );
          } catch (err) {
            console.error('Failed to generate and upload QR Code on decoupling', err);
          }
        }
      }
    }

    let proxima = updateEquipmentDto.proximaManutencao ? new Date(updateEquipmentDto.proximaManutencao) : undefined;

    if (updateEquipmentDto.frequenciaManutencao !== undefined && updateEquipmentDto.proximaManutencao === undefined) {
      const lastMaintenance = await this.prisma.manutencao.findFirst({
        where: { equipamentoId: id, deletedAt: null },
        orderBy: { dataManutencao: 'desc' },
      });
      const baseDate = lastMaintenance ? new Date(lastMaintenance.dataManutencao) : new Date(updateEquipmentDto.dataInstalacao ?? equipment.dataInstalacao);
      const nextDate = new Date(baseDate);
      nextDate.setMonth(nextDate.getMonth() + updateEquipmentDto.frequenciaManutencao);
      proxima = nextDate;
    }

    const updated = await this.prisma.equipamento.update({
      where: { id },
      data: {
        ...updateEquipmentDto,
        qrCode,
        proximaManutencao: proxima,
      },
    });

    await this.audit.log(executorId, 'UPDATE', 'equipamentos', updated.id, ip);
    if (qrCode !== equipment.qrCode && qrCode) {
      await this.audit.log(executorId, 'GENERATE_QRCODE', 'equipamentos', updated.id, ip);
    }

    return updated;
  }

  async remove(id: string, executorId: string, ip: string) {
    const equipment = await this.prisma.equipamento.findFirst({
      where: { id, deletedAt: null },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado');
    }

    await this.prisma.equipamento.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log(executorId, 'DELETE', 'equipamentos', equipment.id, ip);

    return { success: true, message: 'Equipamento excluído com sucesso' };
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
}
