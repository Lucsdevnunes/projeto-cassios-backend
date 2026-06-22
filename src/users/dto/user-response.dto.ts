import { Perfil } from '@prisma/client';

export class UserResponseDto {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: Date;
}
