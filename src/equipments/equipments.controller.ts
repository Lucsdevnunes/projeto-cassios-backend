import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, Header } from '@nestjs/common';
import { EquipmentsService } from './equipments.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentResponseDto } from './dto/equipment-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Perfil } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

@Controller('equipments')
export class EquipmentsController {
  constructor(private readonly equipmentsService: EquipmentsService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  create(@Body() createEquipmentDto: CreateEquipmentDto, @Req() req: Request): Promise<EquipmentResponseDto> {
    const executor = req['user'];
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
    return this.equipmentsService.create(createEquipmentDto, executor.id, ip);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  findAll(@Query('page') page?: string, @Query('limit') limit?: string): Promise<EquipmentResponseDto[]> {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.equipmentsService.findAll(pageNum, limitNum);
  }

  /**
   * Public endpoint accessed by scanning the QR Code.
   * Does NOT use AuthGuard. Anyone can view.
   */
  @Get('public/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // Scraper protection limit to 20 requests per minute
  @Header('Cache-Control', 'public, max-age=60') // Cache for 60 seconds at edge/client level
  findOnePublic(@Param('id') id: string): Promise<EquipmentResponseDto> {
    return this.equipmentsService.findOnePublic(id);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  findOne(@Param('id') id: string): Promise<EquipmentResponseDto> {
    return this.equipmentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  update(@Param('id') id: string, @Body() updateEquipmentDto: UpdateEquipmentDto, @Req() req: Request): Promise<EquipmentResponseDto> {
    const executor = req['user'];
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
    return this.equipmentsService.update(id, updateEquipmentDto, executor.id, ip);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN) // Only administrators can delete equipment
  remove(@Param('id') id: string, @Req() req: Request) {
    const executor = req['user'];
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
    return this.equipmentsService.remove(id, executor.id, ip);
  }
}
