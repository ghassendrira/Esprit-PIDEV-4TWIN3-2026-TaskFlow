import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  listByBusiness(businessId: string) {
    return this.prisma.expense.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateExpenseDto) {
    if (!dto.businessId) throw new BadRequestException('businessId is required');
    if (!dto.createdBy) throw new BadRequestException('createdBy is required');

    return this.prisma.expense.create({
      data: {
        businessId: dto.businessId,
        amount: Number(dto.amount ?? 0),
        date: dto.date ? new Date(dto.date) : new Date(),
        description: dto.description ?? '',
        receiptUrl: dto.receiptUrl ?? '',
        status: dto.status ?? 'PENDING',
        createdBy: dto.createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Expense not found');

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.businessId ? { businessId: dto.businessId } : {}),
        ...(dto.amount !== undefined ? { amount: Number(dto.amount) } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? '' } : {}),
        ...(dto.receiptUrl !== undefined ? { receiptUrl: dto.receiptUrl ?? '' } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.expense.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Expense not found');

    await this.prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
