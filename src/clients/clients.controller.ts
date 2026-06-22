import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Header } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { EstablishmentResponseDto } from './dto/establishment-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Perfil } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  create(@Body() createClientDto: CreateClientDto, @Req() req: Request): Promise<EstablishmentResponseDto> {
    const executor = req['user'];
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
    return this.clientsService.create(createClientDto, executor.id, ip);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  findAll(): Promise<EstablishmentResponseDto[]> {
    return this.clientsService.findAll();
  }

  @Get('public/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // Scraper protection limit to 20 requests per minute
  @Header('Cache-Control', 'public, max-age=60') // Cache for 60 seconds at edge/client level
  findOnePublic(@Param('id') id: string): Promise<EstablishmentResponseDto> {
    return this.clientsService.findOnePublic(id);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  findOne(@Param('id') id: string): Promise<EstablishmentResponseDto> {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto, @Req() req: Request): Promise<EstablishmentResponseDto> {
    const executor = req['user'];
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
    return this.clientsService.update(id, updateClientDto, executor.id, ip);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Perfil.ADMIN) // Only Admins can delete client accounts
  remove(@Param('id') id: string, @Req() req: Request) {
    const executor = req['user'];
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
    return this.clientsService.remove(id, executor.id, ip);
  }
}
