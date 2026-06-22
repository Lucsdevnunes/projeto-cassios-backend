import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalEquipments = await this.prisma.equipamento.count({
      where: { deletedAt: null },
    });

    const totalMaintenances = await this.prisma.manutencao.count({
      where: { deletedAt: null },
    });

    // 1. Equipments by brand
    const equipmentsByBrand = await this.prisma.equipamento.groupBy({
      by: ['marca'],
      where: { deletedAt: null },
      _count: {
        _all: true,
      },
    });

    // 2. Equipments by installation location
    const equipmentsByLocation = await this.prisma.equipamento.groupBy({
      by: ['localInstalacao'],
      where: { deletedAt: null },
      _count: {
        _all: true,
      },
    });

    // 3. Maintenances by technician
    const maintenancesByTechnician = await this.prisma.manutencao.groupBy({
      by: ['tecnicoNome'],
      where: { deletedAt: null },
      _count: {
        _all: true,
      },
    });

    // 4. Latest maintenance logs (last 5)
    const latestMaintenances = await this.prisma.manutencao.findMany({
      where: { deletedAt: null },
      include: {
        equipamento: {
          select: { codigoInterno: true, marca: true, modelo: true },
        },
      },
      orderBy: { dataManutencao: 'desc' },
      take: 5,
    });

    // 5. Calculate maintenance statuses (Delayed / Up-to-date)
    // We check all equipments and see when their last maintenance was (or installation date)
    const equipments = await this.prisma.equipamento.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        codigoInterno: true,
        marca: true,
        modelo: true,
        localInstalacao: true,
        dataInstalacao: true,
        manutencoes: {
          where: { deletedAt: null },
          select: { dataManutencao: true },
          orderBy: { dataManutencao: 'desc' },
          take: 1,
        },
      },
    });

    const now = new Date();
    const delayed3Months: any[] = [];
    const delayed6Months: any[] = [];
    const delayed12Months: any[] = [];
    const upcomingPreventives: any[] = [];

    for (const eq of equipments) {
      const lastActionDate = eq.manutencoes[0] ? new Date(eq.manutencoes[0].dataManutencao) : new Date(eq.dataInstalacao);
      const diffTime = Math.abs(now.getTime() - lastActionDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = diffDays / 30;

      const equipmentData = {
        id: eq.id,
        codigoInterno: eq.codigoInterno,
        marca: eq.marca,
        modelo: eq.modelo,
        localInstalacao: eq.localInstalacao,
        lastMaintenance: lastActionDate,
        monthsSinceLast: Math.round(diffMonths * 10) / 10,
      };

      // Classify alerts
      if (diffMonths >= 12) {
        delayed12Months.push(equipmentData);
      } else if (diffMonths >= 6) {
        delayed6Months.push(equipmentData);
      } else if (diffMonths >= 3) {
        delayed3Months.push(equipmentData);
      }

      // Upcoming preventive: if maintenance is due in the next 15 days for a 6-month cycle
      // meaning months elapsed is between 5.5 and 6 months
      if (diffMonths >= 5.5 && diffMonths < 6) {
        upcomingPreventives.push(equipmentData);
      }
    }

    return {
      summary: {
        totalEquipments,
        totalMaintenances,
        totalDelayed: delayed3Months.length + delayed6Months.length + delayed12Months.length,
      },
      charts: {
        brands: equipmentsByBrand.map((b) => ({ name: b.marca, value: b._count._all })),
        locations: equipmentsByLocation.map((l) => ({ name: l.localInstalacao, value: l._count._all })),
        technicians: maintenancesByTechnician.map((t) => ({ name: t.tecnicoNome, value: t._count._all })),
      },
      latestMaintenances,
      alerts: {
        delayed3Months,
        delayed6Months,
        delayed12Months,
        upcomingPreventives,
      },
    };
  }
}
