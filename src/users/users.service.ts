import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(createUserDto: CreateUserDto, executorId: string, ip: string): Promise<UserResponseDto> {
    const { email, senha, nome, perfil, ativo } = createUserDto;

    const existingUser = await this.prisma.usuario.findFirst({
      where: { email, deletedAt: null },
    });

    if (existingUser) {
      throw new ConflictException('Este endereço de e-mail já está cadastrado');
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = await this.prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
        perfil,
        ativo: ativo ?? true,
      },
    });

    await this.audit.log(executorId, 'CREATE', 'usuarios', user.id, ip);

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      ativo: user.ativo,
      criadoEm: user.criadoEm,
    };
  }

  async findAll(): Promise<UserResponseDto[]> {
    return this.prisma.usuario.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        criadoEm: true,
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        criadoEm: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, executorId: string, ip: string): Promise<UserResponseDto> {
    const user = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const data: any = { ...updateUserDto };
    
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailConflict = await this.prisma.usuario.findFirst({
        where: { email: updateUserDto.email, deletedAt: null },
      });
      if (emailConflict) {
        throw new ConflictException('Este endereço de e-mail já está em uso por outro usuário');
      }
    }

    if (updateUserDto.senha) {
      data.senhaHash = await bcrypt.hash(updateUserDto.senha, 10);
      delete data.senha;
    }

    const updatedUser = await this.prisma.usuario.update({
      where: { id },
      data,
    });

    await this.audit.log(executorId, 'UPDATE', 'usuarios', updatedUser.id, ip);

    return {
      id: updatedUser.id,
      nome: updatedUser.nome,
      email: updatedUser.email,
      perfil: updatedUser.perfil,
      ativo: updatedUser.ativo,
      criadoEm: updatedUser.criadoEm,
    };
  }

  async remove(id: string, executorId: string, ip: string) {
    const user = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.id === executorId) {
      throw new ConflictException('Você não pode excluir a sua própria conta');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date(), ativo: false },
    });

    await this.audit.log(executorId, 'DELETE', 'usuarios', user.id, ip);

    return { success: true, message: 'Usuário excluído com sucesso' };
  }
}
