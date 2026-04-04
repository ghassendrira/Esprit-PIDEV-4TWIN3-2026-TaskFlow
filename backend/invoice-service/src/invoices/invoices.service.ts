import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async listByBusiness(businessId: string) {
    return this.prisma.invoice.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payments: true },
    });
  }

  private computeItemsTotal(items: CreateInvoiceDto['items']) {
    if (!items || items.length === 0) return { items: [], total: 0 };

    const normalized = items.map((it) => {
      const quantity = Number(it.quantity ?? 0);
      const unitPrice = Number(it.unitPrice ?? 0);
      const amount = Number.isFinite(it.amount as any)
        ? Number(it.amount)
        : quantity * unitPrice;
      return {
        description: String(it.description ?? '').trim(),
        quantity,
        unitPrice,
        amount,
      };
    });

    const total = normalized.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    return { items: normalized, total };
  }

  async create(dto: CreateInvoiceDto) {
    if (!dto.businessId) throw new BadRequestException('businessId is required');
    if (!dto.clientId) throw new BadRequestException('clientId is required');

    const invoiceNumber = (dto.invoiceNumber?.trim() || `INV-${Date.now()}`).slice(0, 64);
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : issueDate;

    const { items, total } = this.computeItemsTotal(dto.items);
    const totalAmount = Number.isFinite(dto.totalAmount as any) ? Number(dto.totalAmount) : total;
    const taxAmount = Number.isFinite(dto.taxAmount as any) ? Number(dto.taxAmount) : 0;

    return this.prisma.invoice.create({
      data: {
        businessId: dto.businessId,
        clientId: dto.clientId,
        createdBy: dto.createdBy ?? undefined,
        invoiceNumber,
        status: dto.status ?? 'DRAFT',
        issueDate,
        dueDate,
        totalAmount,
        taxAmount,
        pdfUrl: dto.pdfUrl ?? '',
        notes: dto.notes ?? '',
        items: items.length
          ? {
              create: items.map((it) => ({
                description: it.description,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                amount: it.amount,
              })),
            }
          : undefined,
      },
      include: { items: true, payments: true },
    });
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const existing = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Invoice not found');

    const issueDate = dto.issueDate ? new Date(dto.issueDate) : undefined;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;

    const { items, total } = this.computeItemsTotal(dto.items);
    const totalAmount = dto.items ? total : dto.totalAmount;

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.businessId ? { businessId: dto.businessId } : {}),
        ...(dto.clientId ? { clientId: dto.clientId } : {}),
        ...(dto.invoiceNumber !== undefined ? { invoiceNumber: dto.invoiceNumber || existing.invoiceNumber } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(issueDate ? { issueDate } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(dto.taxAmount !== undefined ? { taxAmount: Number(dto.taxAmount) } : {}),
        ...(totalAmount !== undefined ? { totalAmount: Number(totalAmount) } : {}),
        ...(dto.pdfUrl !== undefined ? { pdfUrl: dto.pdfUrl ?? '' } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? '' } : {}),
        ...(dto.items
          ? {
              items: {
                deleteMany: { invoiceId: id },
                create: items.map((it) => ({
                  description: it.description,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                  amount: it.amount,
                })),
              },
            }
          : {}),
      },
      include: { items: true, payments: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Invoice not found');

    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
