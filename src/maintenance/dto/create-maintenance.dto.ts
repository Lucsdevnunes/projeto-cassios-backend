import { IsNotEmpty, IsUUID, IsDateString, IsOptional, IsString, IsInt, Min, IsArray, IsNumber, IsPositive, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenanceMaterialDto {
  @IsUUID('4', { message: 'ID do material inválido' })
  @IsNotEmpty({ message: 'ID do material é obrigatório' })
  materialId: string;

  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @IsPositive({ message: 'Quantidade deve ser maior que zero' })
  quantidade: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class CreateMaintenanceDto {
  @IsUUID('4', { message: 'ID do equipamento inválido' })
  @IsNotEmpty({ message: 'ID do equipamento é obrigatório' })
  equipamentoId: string;

  @IsDateString({}, { message: 'Data da manutenção inválida' })
  @IsNotEmpty({ message: 'Data da manutenção é obrigatória' })
  dataManutencao: string;

  @IsNotEmpty({ message: 'Serviço realizado é obrigatório' })
  @IsString()
  servicoRealizado: string;

  @IsNotEmpty({ message: 'Descrição do serviço é obrigatória' })
  @IsString()
  descricao: string;

  @IsOptional()
  @IsString()
  pecaTrocada?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantidade?: number;

  @IsNotEmpty({ message: 'Nome do técnico é obrigatório' })
  @IsString()
  tecnicoNome: string;

  @IsNotEmpty({ message: 'Assinatura do técnico é obrigatória' })
  @IsString()
  tecnicoAssinatura: string; // Base64 signature image

  @IsNotEmpty({ message: 'Nome do contratante é obrigatório' })
  @IsString()
  contratanteNome: string;

  @IsNotEmpty({ message: 'Assinatura do contratante é obrigatória' })
  @IsString()
  contratanteAssinatura: string; // Base64 signature image

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosAntes?: string[]; // Array of Base64 strings for before photos

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosDepois?: string[]; // Array of Base64 strings for after photos

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaintenanceMaterialDto)
  materiais?: CreateMaintenanceMaterialDto[];
}
