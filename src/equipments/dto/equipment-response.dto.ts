import { TipoEquipamento } from '@prisma/client';
import { MaintenanceResponseDto } from '../../maintenance/dto/maintenance-response.dto';

export class EquipmentResponseDto {
  id: string;
  codigoInterno: string;
  qrCode?: string | null;
  endereco: string;
  localInstalacao: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  btu: number;
  tipo: TipoEquipamento;
  dataInstalacao: Date;
  observacoes?: string | null;
  criadoPor?: string;
  clienteId?: string | null;
  criadoEm: Date;
  
  criador?: {
    nome: string;
    email: string;
  };
  
  cliente?: {
    nome: string;
    qrCode?: string | null;
  } | null;
  
  manutencoes?: MaintenanceResponseDto[];
}
