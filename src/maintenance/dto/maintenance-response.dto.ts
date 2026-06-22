export class MaintenanceResponseDto {
  id: string;
  equipamentoId?: string;
  dataManutencao: Date;
  servicoRealizado: string;
  descricao: string;
  pecaTrocada?: string | null;
  quantidade: number;
  tecnicoNome: string;
  tecnicoAssinatura: string;
  contratanteNome: string;
  contratanteAssinatura: string;
  observacoes?: string | null;
  criadoEm?: Date;
  
  equipamento?: {
    codigoInterno: string;
    marca: string;
    modelo: string;
    localInstalacao: string;
  };
  
  fotos?: {
    id: string;
    tipo: string;
    arquivo: string;
  }[];
}
