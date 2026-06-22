import { IsEmail, IsOptional, IsEnum, MinLength, IsBoolean } from 'class-validator';
import { Perfil } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  nome?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @IsOptional()
  @MinLength(6, { message: 'A senha deve conter no mínimo 6 caracteres' })
  senha?: string;

  @IsOptional()
  @IsEnum(Perfil, { message: 'Perfil inválido (deve ser ADMIN ou TECNICO)' })
  perfil?: Perfil;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
