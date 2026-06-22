import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail do cliente é inválido' })
  email?: string;
}
