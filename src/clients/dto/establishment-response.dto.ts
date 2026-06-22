import { EquipmentResponseDto } from '../../equipments/dto/equipment-response.dto';

export class EstablishmentResponseDto {
  id: string;
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  qrCode?: string | null;
  criadoEm: Date;
  _count?: {
    equipamentos: number;
  };
  equipamentos?: EquipmentResponseDto[];
}
