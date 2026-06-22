import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty({ message: 'Nome do cliente é obrigatório' })
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  documento?: string; // CNPJ/CPF

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail do cliente é inválido' })
  email?: string;
}
