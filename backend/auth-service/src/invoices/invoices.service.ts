import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { BaseProxyService } from '../common/base-proxy.service';

@Injectable()
export class InvoicesProxyService extends BaseProxyService {
  constructor(
    prisma: PrismaService,
    jwt: JwtService,
  ) {
    super(prisma, jwt);
  }

  private canAssignToOtherUser(roleName: string) {
    const upper = roleName.toUpperCase();
    return ['ADMIN', 'SUPER_ADMIN', 'SUPER_MANAGER', 'NIGHT_SHIFT_LEAD'].includes(upper);
  }

  private async assertUserInTenant(tenantId: string, userId: string) {
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Target user not in this company');
  }

  private invoiceBase() {
    return (process.env.INVOICE_SERVICE_URL ?? 'http://localhost:3007').replace(/\/+$/, '');
  }

  async listByBusiness(authHeader: string, tenantIdFromHeader: string, businessId: string) {
    const tenantId = (tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined')
      ? tenantIdFromHeader
      : await this.resolveTenantIdFromBusiness(businessId);
    const ctx = await this.getContext(authHeader, tenantId);
    await this.assertBusinessInTenant(ctx.tenantId, businessId);

    const url = `${this.invoiceBase()}/invoices/by-business/${encodeURIComponent(businessId)}`;
    const r = await fetch(url);
    if (!r.ok) throw new BadGatewayException('Invoice service error');
    return r.json();
  }

  async create(authHeader: string, tenantIdFromHeader: string, body: any) {
    const businessId = body?.businessId as string;
    let tenantId = (tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined')
      ? tenantIdFromHeader
      : null;

    if (!tenantId && businessId) {
      tenantId = await this.resolveTenantIdFromBusiness(businessId);
    }

    const ctx = await this.getContext(authHeader, tenantId ?? undefined);
    if (!this.canWrite(ctx.roleName)) throw new ForbiddenException('Read-only for Business Owner');

    if (!businessId) throw new BadRequestException('businessId is required');
    await this.assertBusinessInTenant(ctx.tenantId, businessId);

    const url = `${this.invoiceBase()}/invoices`;
    const requestedCreatedBy = (body?.createdByUserId || body?.createdBy) as string | undefined;
    let createdBy = ctx.userId;
    if (requestedCreatedBy) {
      if (!this.canAssignToOtherUser(ctx.roleName)) throw new ForbiddenException('Only admin can assign to another user');
      await this.assertUserInTenant(ctx.tenantId, requestedCreatedBy);
      createdBy = requestedCreatedBy;
    }

    const payload = { ...body, createdBy };
    delete (payload as any).createdByUserId;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new BadGatewayException('Invoice service error');
    return r.json();
  }

  async update(authHeader: string, tenantIdFromHeader: string, id: string, body: any) {
    const businessId = body?.businessId as string | undefined;
    let tenantId = (tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined')
      ? tenantIdFromHeader
      : null;

    if (!tenantId && businessId) {
      tenantId = await this.resolveTenantIdFromBusiness(businessId);
    }

    const ctx = await this.getContext(authHeader, tenantId ?? undefined);
    if (!this.canWrite(ctx.roleName)) throw new ForbiddenException('Read-only for Business Owner');

    if (businessId) await this.assertBusinessInTenant(ctx.tenantId, businessId);

    const url = `${this.invoiceBase()}/invoices/${encodeURIComponent(id)}`;
    if (body && typeof body === 'object') {
      delete body.createdBy;
      delete body.createdByUserId;
    }
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new BadGatewayException('Invoice service error');
    return r.json();
  }

  async remove(authHeader: string, tenantIdFromHeader: string, id: string) {
    const ctx = await this.getContext(authHeader, tenantIdFromHeader);
    if (!this.canWrite(ctx.roleName)) throw new ForbiddenException('Read-only for Business Owner');

    const url = `${this.invoiceBase()}/invoices/${encodeURIComponent(id)}`;
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new BadGatewayException('Invoice service error');
    return { success: true };
  }
}

