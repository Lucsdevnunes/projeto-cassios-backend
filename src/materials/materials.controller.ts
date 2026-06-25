import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Perfil } from '@prisma/client';

@Controller('materials')
@UseGuards(AuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  findAll() {
    return this.materialsService.findAll();
  }

  @Get(':id')
  @Roles(Perfil.ADMIN, Perfil.TECNICO)
  findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }
}
