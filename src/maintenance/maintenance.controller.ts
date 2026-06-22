import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { MaintenanceResponseDto } from './dto/maintenance-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Perfil } from '@prisma/client';
import type { Request } from 'express';

@Controller('maintenance')
@UseGuards(AuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  create(@Body() createMaintenanceDto: CreateMaintenanceDto, @Req() req: Request): Promise<MaintenanceResponseDto> {
    const executor = req['user'];
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
    return this.maintenanceService.create(createMaintenanceDto, executor.id, ip);
  }

  @Get()
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  findAll(@Query('page') page?: string, @Query('limit') limit?: string): Promise<MaintenanceResponseDto[]> {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.maintenanceService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  findOne(@Param('id') id: string): Promise<MaintenanceResponseDto> {
    return this.maintenanceService.findOne(id);
  }

  @Delete(':id')
  @Roles(Perfil.ADMIN) // Only Admins can delete maintenance history records
  remove(@Param('id') id: string, @Req() req: Request) {
    const executor = req['user'];
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
    return this.maintenanceService.remove(id, executor.id, ip);
  }
}
