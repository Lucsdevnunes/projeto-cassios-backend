import { IsNotEmpty, IsEnum, IsInt, Min, IsOptional, IsString, IsUUID } from 'class-validator';
import { TipoEquipamento } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateEquipmentDto {
  @IsOptional()
  @IsUUID('4', { message: 'ID do cliente inválido' })
  clienteId?: string;
  @IsNotEmpty({ message: 'Código interno é obrigatório' })
  codigoInterno: string;

  @IsNotEmpty({ message: 'Endereço da instalação é obrigatório' })
  endereco: string;

  @IsNotEmpty({ message: 'Local da instalação é obrigatório' })
  localInstalacao: string;

  @IsNotEmpty({ message: 'Marca é obrigatória' })
  marca: string;

  @IsNotEmpty({ message: 'Modelo é obrigatório' })
  modelo: string;

  @IsNotEmpty({ message: 'Número de série é obrigatório' })
  numeroSerie: string;

  @IsInt({ message: 'BTUs deve ser um número inteiro' })
  @Min(1, { message: 'BTUs deve ser maior que zero' })
  @Type(() => Number)
  btu: number;

  @IsEnum(TipoEquipamento, { message: 'Tipo de equipamento inválido (SPLIT, CASSETE, PISO_TETO, JANELA, VRF, MULTI_SPLIT, OUTROS)' })
  @IsNotEmpty({ message: 'Tipo de equipamento é obrigatório' })
  tipo: TipoEquipamento;

  @IsNotEmpty({ message: 'Data de instalação é obrigatória' })
  @Type(() => Date)
  dataInstalacao: Date;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
