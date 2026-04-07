import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    name: string;
    logoUrl?: string;
    currency: string;
    taxRate: number;
    category?: string;
  }) {
    const business = await this.prisma.business.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        logoUrl: data.logoUrl ?? '',
        currency: data.currency,
        taxRate: data.taxRate,
        category: data.category ?? 'Autre',
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        logoUrl: true,
        currency: true,
        taxRate: true,
        category: true,
        createdAt: true,
      },
    });

    // Automatically create default expense categories via expense-service
    try {
      const expenseServiceUrl = process.env.EXPENSE_SERVICE_URL ?? 'http://localhost:3006';
      await fetch(`${expenseServiceUrl}/expenses/initialize-categories/${business.id}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to initialize business categories:', error);
    }

    return business;
  }

  byTenant(tenantId: string) {
    return this.prisma.business.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        logoUrl: true,
        currency: true,
        taxRate: true,
        category: true,
        createdAt: true,
      },
    });
  }

  byId(id: string) {
    return this.prisma.business.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        logoUrl: true,
        currency: true,
        taxRate: true,
        category: true,
        createdAt: true,
      },
    });
  }

  countByTenant(tenantId: string) {
    return this.prisma.business.count({ where: { tenantId } });
  }

  update(
    id: string,
    data: {
      name?: string;
      logoUrl?: string;
      currency?: string;
      taxRate?: number;
      category?: string;
    },
  ) {
    return this.prisma.business.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl ?? '' } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.taxRate !== undefined ? { taxRate: data.taxRate } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        logoUrl: true,
        currency: true,
        taxRate: true,
        category: true,
        createdAt: true,
      },
    });
  }
}
