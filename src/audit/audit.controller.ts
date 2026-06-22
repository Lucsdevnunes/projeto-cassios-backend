import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Perfil } from '@prisma/client';

@Controller('audit')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Perfil.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('acao') acao?: string,
    @Query('tabela') tabela?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.auditService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      usuarioId,
      acao,
      tabela,
      dataInicio,
      dataFim,
    });
  }
}
