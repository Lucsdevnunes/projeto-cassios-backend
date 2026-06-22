import { IsEmail, IsNotEmpty, IsEnum, MinLength, IsBoolean, IsOptional } from 'class-validator';
import { Perfil } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'A senha deve conter no mínimo 6 caracteres' })
  senha: string;

  @IsEnum(Perfil, { message: 'Perfil inválido (deve ser ADMIN ou TECNICO)' })
  @IsNotEmpty({ message: 'Perfil é obrigatório' })
  perfil: Perfil;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
