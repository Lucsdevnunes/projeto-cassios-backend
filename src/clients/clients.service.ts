import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { EstablishmentResponseDto } from './dto/establishment-response.dto';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private storage: StorageService,
  ) {}

  async create(createClientDto: CreateClientDto, executorId: string, ip: string): Promise<EstablishmentResponseDto> {
    const uuid = uuidv4();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const publicUrl = `${frontendUrl}/estabelecimento/${uuid}`;

    let qrCodeUrl = '';
    try {
      const qrCodeBuffer = await QRCode.toBuffer(publicUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
      });
      qrCodeUrl = await this.storage.uploadFile(
        qrCodeBuffer,
        `qrcode-client-${uuid}.png`,
        'image/png',
        'qrcodes',
      );
    } catch (err) {
      console.error('Failed to generate and upload QR Code for client', err);
      throw new Error('Erro ao gerar imagem do QR Code para o estabelecimento');
    }

    const client = await this.prisma.cliente.create({
      data: {
        id: uuid,
        nome: createClientDto.nome,
        documento: createClientDto.documento || null,
        telefone: createClientDto.telefone || null,
        email: createClientDto.email || null,
        qrCode: qrCodeUrl,
      },
    });

    await this.audit.log(executorId, 'CREATE', 'clientes', client.id, ip);
    await this.audit.log(executorId, 'GENERATE_QRCODE', 'clientes', client.id, ip);

    return client;
  }

  async findAll(): Promise<EstablishmentResponseDto[]> {
    const clients = await this.prisma.cliente.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      include: {
        _count: {
          select: { equipamentos: { where: { deletedAt: null } } },
        },
      },
    });

    // Generate presigned URLs for QR codes
    for (const client of clients) {
      if (client.qrCode) {
        client.qrCode = await this.storage.getPresignedUrl(client.qrCode);
      }
    }

    return clients;
  }

  async findOne(id: string): Promise<EstablishmentResponseDto> {
    const client = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
      include: {
        equipamentos: {
          where: { deletedAt: null },
          orderBy: { codigoInterno: 'asc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Dynamic QR Code generation for legacy data
    if (!client.qrCode || client.qrCode.startsWith('data:image/')) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const publicUrl = `${frontendUrl}/estabelecimento/${client.id}`;
      try {
        const qrCodeBuffer = await QRCode.toBuffer(publicUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 300,
        });
        const qrCodeUrl = await this.storage.uploadFile(
          qrCodeBuffer,
          `qrcode-client-${client.id}.png`,
          'image/png',
          'qrcodes',
        );
        await this.prisma.cliente.update({
          where: { id: client.id },
          data: { qrCode: qrCodeUrl },
        });
        client.qrCode = qrCodeUrl;
      } catch (err) {
        console.error('Failed to generate QR Code dynamically', err);
      }
    }

    // Generate presigned URL for QR code
    if (client.qrCode) {
      client.qrCode = await this.storage.getPresignedUrl(client.qrCode);
    }

    return client;
  }

  async findOnePublic(id: string): Promise<EstablishmentResponseDto> {
    const client = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
      include: {
        equipamentos: {
          where: { deletedAt: null },
          orderBy: { codigoInterno: 'asc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }

    // Dynamic QR Code generation for legacy data
    if (!client.qrCode || client.qrCode.startsWith('data:image/')) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const publicUrl = `${frontendUrl}/estabelecimento/${client.id}`;
      try {
        const qrCodeBuffer = await QRCode.toBuffer(publicUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 300,
        });
        const qrCodeUrl = await this.storage.uploadFile(
          qrCodeBuffer,
          `qrcode-client-${client.id}.png`,
          'image/png',
          'qrcodes',
        );
        await this.prisma.cliente.update({
          where: { id: client.id },
          data: { qrCode: qrCodeUrl },
        });
        client.qrCode = qrCodeUrl;
      } catch (err) {
        console.error('Failed to generate QR Code dynamically', err);
      }
    }

    // Generate presigned URL for QR code
    if (client.qrCode) {
      client.qrCode = await this.storage.getPresignedUrl(client.qrCode);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto, executorId: string, ip: string): Promise<EstablishmentResponseDto> {
    const client = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const updated = await this.prisma.cliente.update({
      where: { id },
      data: updateClientDto,
    });

    await this.audit.log(executorId, 'UPDATE', 'clientes', updated.id, ip);

    return updated;
  }

  async remove(id: string, executorId: string, ip: string) {
    const client = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    await this.prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log(executorId, 'DELETE', 'clientes', id, ip);

    return { success: true, message: 'Cliente excluído com sucesso' };
  }
}
