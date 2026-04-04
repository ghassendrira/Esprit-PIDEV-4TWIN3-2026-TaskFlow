import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    businessId: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
  }) {
    if (!data.businessId) throw new BadRequestException('businessId is required');
    if (!data.name?.trim()) throw new BadRequestException('name is required');

    return this.prisma.client.create({
      data: {
        businessId: data.businessId,
        name: data.name.trim(),
        email: (data.email ?? '').trim().toLowerCase(),
        phone: (data.phone ?? '').trim(),
        address: (data.address ?? '').trim(),
        taxNumber: (data.taxNumber ?? '').trim(),
      },
      select: {
        id: true,
        businessId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  listByBusiness(businessId: string) {
    return this.prisma.client.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async get(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        businessId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      taxNumber?: string;
    },
  ) {
    const existing = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Client not found');

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.email !== undefined
          ? { email: (data.email ?? '').trim().toLowerCase() }
          : {}),
        ...(data.phone !== undefined ? { phone: (data.phone ?? '').trim() } : {}),
        ...(data.address !== undefined
          ? { address: (data.address ?? '').trim() }
          : {}),
        ...(data.taxNumber !== undefined
          ? { taxNumber: (data.taxNumber ?? '').trim() }
          : {}),
      },
      select: {
        id: true,
        businessId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async softDelete(id: string) {
    const existing = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Client not found');

    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    return { success: true };
  }
}
