import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private validateUuid(id: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) throw new BadRequestException(`Invalid UUID: ${id}`);
  }

  private async verifyOwnership(id: string, tenantId: string, includeDeleted = false) {
    try {
      // 1. Find invoice by id and join with business
      const invoice = await this.prisma.invoice.findFirst({
        where: { 
          id, 
          ...(includeDeleted ? {} : { deletedAt: null })
        },
        include: { 
          items: true,
        }
      });

      if (!invoice) return null;

      // 2. Fetch business to get tenantId (since Invoice doesn't have a direct relation field in Prisma schema provided)
      const businessUrl = `${process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003'}/businesses/${encodeURIComponent(invoice.businessId)}`;
      const response = await fetch(businessUrl);
      if (!response.ok) return null;
      
      const business = await response.json();
      
      // 3. Verify that Business.tenantId matches the X-Tenant-Id header
      if (!business || String(business.tenantId).toLowerCase() !== String(tenantId).toLowerCase()) {
        return null;
      }

      return invoice;
    } catch (e) {
      console.error('Error verifying ownership:', e);
      return null;
    }
  }

  async findOne(id: string, tenantId: string) {
    this.validateUuid(id);
    
    const invoice = await this.verifyOwnership(id, tenantId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    return invoice;
  }

  async listByBusiness(businessId: string, tenantId: string) {
    this.validateUuid(businessId);
    
    // Verify business belongs to tenant
    const businessUrl = `${process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003'}/businesses/${encodeURIComponent(businessId)}`;
    const response = await fetch(businessUrl);
    if (!response.ok) throw new BadRequestException('Business not found');
    const business = await response.json();
    
    if (String(business.tenantId).toLowerCase() !== String(tenantId).toLowerCase()) {
      throw new BadRequestException('Access denied for this business');
    }

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

  async create(dto: CreateInvoiceDto, tenantId: string) {
    if (!dto.businessId) throw new BadRequestException('businessId is required');
    if (!dto.clientId) throw new BadRequestException('clientId is required');

    // Verify business belongs to tenant
    const businessUrl = `${process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003'}/businesses/${encodeURIComponent(dto.businessId)}`;
    const response = await fetch(businessUrl);
    if (!response.ok) throw new BadRequestException('Business not found');
    const business = await response.json();
    
    if (String(business.tenantId).toLowerCase() !== String(tenantId).toLowerCase()) {
      throw new BadRequestException('Access denied for this business');
    }

    const invoiceNumber = (dto.invoiceNumber?.trim() || `INV-${Date.now()}`).slice(0, 64);
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : issueDate;

    const { items, total } = this.computeItemsTotal(dto.items);
    const taxAmount = Number.isFinite(dto.taxAmount as any) ? Number(dto.taxAmount) : 0;
    const totalAmount = total + taxAmount;

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

  async update(id: string, dto: UpdateInvoiceDto, tenantId: string) {
    const invoice = await this.verifyOwnership(id, tenantId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const issueDate = dto.issueDate ? new Date(dto.issueDate) : undefined;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;

    const { items, total } = this.computeItemsTotal(dto.items);
    
    let totalAmount = invoice.totalAmount;
    let taxAmount = dto.taxAmount !== undefined ? Number(dto.taxAmount) : invoice.taxAmount;

    if (dto.items) {
      totalAmount = total + taxAmount;
    } else if (dto.taxAmount !== undefined) {
      const existingSubtotal = invoice.totalAmount - invoice.taxAmount;
      totalAmount = existingSubtotal + taxAmount;
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.businessId ? { businessId: dto.businessId } : {}),
        ...(dto.clientId ? { clientId: dto.clientId } : {}),
        ...(dto.createdBy ? { createdBy: dto.createdBy } : {}),
        ...(dto.invoiceNumber !== undefined ? { invoiceNumber: dto.invoiceNumber || invoice.invoiceNumber } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(issueDate ? { issueDate } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(dto.taxAmount !== undefined ? { taxAmount } : {}),
        ...(dto.items ? { totalAmount } : (dto.taxAmount !== undefined ? { totalAmount } : {})),
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

  async remove(id: string, tenantId: string) {
    const invoice = await this.verifyOwnership(id, tenantId, true);
    if (!invoice) throw new NotFoundException('Invoice not found');

    await this.prisma.invoice.delete({
      where: { id },
    });

    return { success: true };
  }

  async send(id: string, tenantId: string) {
    this.validateUuid(id);
    const invoice = await this.verifyOwnership(id, tenantId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    let clientEmail = 'client@example.com';
    let clientName = 'Client';
    try {
      const response = await fetch(`${process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003'}/clients/${invoice.clientId}`);
      if (response.ok) {
        const client = await response.json();
        clientEmail = client.email;
        clientName = client.name;
      }
    } catch (e) {
      console.error('Error fetching client info:', e.message);
    }

    let businessName = 'Votre Entreprise';
    try {
      const response = await fetch(`${process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003'}/businesses/${invoice.businessId}`);
      if (response.ok) {
        const business = await response.json();
        businessName = business.name;
      }
    } catch (e) {
      console.error('Error fetching business info:', e.message);
    }

    const subtotal = invoice.totalAmount - invoice.taxAmount;

    try {
      const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
      console.log(`Attempting to send invoice email via: ${notificationUrl}/notification/invoice`);
      
      const notifResponse = await fetch(`${notificationUrl}/notification/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clientEmail,
          clientName: clientName,
          businessName: businessName,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          items: (invoice.items || []).map(it => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            amount: it.amount
          })),
          subtotal,
          taxAmount: invoice.taxAmount,
          totalAmount: invoice.totalAmount,
          notes: invoice.notes,
        }),
      });

      if (!notifResponse.ok) {
        const errorText = await notifResponse.text();
        let errorMessage = `Notification service returned ${notifResponse.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage += `: ${errorJson.message || errorJson.error || errorText}`;
        } catch {
          errorMessage += `: ${errorText}`;
        }
        console.error('Notification service error:', errorMessage);
        throw new Error(errorMessage);
      }

      await this.prisma.invoice.update({
        where: { id },
        data: { status: 'SENT' },
      });

      return { success: true };
    } catch (e) {
      console.error('Error sending invoice email:', e);
      const msg = e.message || 'Unknown error';
      throw new BadRequestException(`Failed to send email: ${msg}`);
    }
  }
}
