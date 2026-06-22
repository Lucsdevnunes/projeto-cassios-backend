import { IsOptional, IsEnum, IsInt, Min, IsString, IsUUID } from 'class-validator';
import { TipoEquipamento } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateEquipmentDto {
  @IsOptional()
  @IsUUID('4', { message: 'ID do cliente inválido' })
  clienteId?: string;
  @IsOptional()
  codigoInterno?: string;

  @IsOptional()
  endereco?: string;

  @IsOptional()
  localInstalacao?: string;

  @IsOptional()
  marca?: string;

  @IsOptional()
  modelo?: string;

  @IsOptional()
  numeroSerie?: string;

  @IsOptional()
  @IsInt({ message: 'BTUs deve ser um número inteiro' })
  @Min(1, { message: 'BTUs deve ser maior que zero' })
  @Type(() => Number)
  btu?: number;

  @IsOptional()
  @IsEnum(TipoEquipamento, { message: 'Tipo de equipamento inválido' })
  tipo?: TipoEquipamento;

  @IsOptional()
  @Type(() => Date)
  dataInstalacao?: Date;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
