import { BadGatewayException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

export abstract class BaseProxyService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly jwt: JwtService,
  ) {}

  protected async getContext(authHeader?: string, tenantIdFromHeader?: string) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = authHeader.substring('Bearer '.length);

    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });

    const userId = payload?.sub as string;
    if (!userId) throw new UnauthorizedException();

    const tenantId = (tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined')
      ? tenantIdFromHeader
      : null;

    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');

    const elevatedRoleNames = new Set(['SUPER_ADMIN', 'SUPER_MANAGER', 'ADMIN', 'NIGHT_SHIFT_LEAD']);
    const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
    const email = String(payload?.email ?? '').trim().toLowerCase();
    const isAdminEmail = !!adminEmail && !!email && email === adminEmail;

    const jwtRoles = Array.isArray(payload?.roles) ? payload.roles : [];
    const normalizedJwtRoles = jwtRoles.map((r: any) => String(r ?? '').toUpperCase());
    const hasElevatedJwtRole = normalizedJwtRoles.some((r: string) => elevatedRoleNames.has(r));

    const elevatedMembership = await this.prisma.userTenantMembership.findFirst({
      where: {
        userId,
        deletedAt: null,
        role: { name: { in: Array.from(elevatedRoleNames) } },
      },
      include: { role: true },
    });

    const isElevated = !!elevatedMembership || isAdminEmail || hasElevatedJwtRole;
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId, tenantId, deletedAt: null },
      include: { role: true },
    });

    if (!membership) {
      if (!isElevated) throw new ForbiddenException('No membership for this company');
      const roleName = elevatedMembership?.role?.name
        ? String(elevatedMembership.role.name)
        : normalizedJwtRoles.find((r: string) => elevatedRoleNames.has(r)) ?? 'SUPER_ADMIN';
      return { userId, tenantId, roleName };
    }

    return { userId, tenantId, roleName: membership.role.name };
  }

  protected async resolveTenantIdFromBusiness(businessId: string) {
    const base = (process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003').replace(/\/+$/, '');
    const url = `${base}/businesses/${encodeURIComponent(businessId)}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new BadGatewayException('Business service error');
      const business = await r.json();
      if (!business?.tenantId) throw new BadRequestException('Unable to resolve tenant');
      return business.tenantId;
    } catch {
      throw new BadGatewayException('Business service unavailable');
    }
  }

  protected async assertBusinessInTenant(tenantId: string, businessId: string) {
    const base = (process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003').replace(/\/+$/, '');
    const url = `${base}/businesses/by-tenant/${encodeURIComponent(tenantId)}`;
    try {
      const r = await fetch(url);
      const list = await r.json();
      if (!Array.isArray(list) || !list.some(b => b.id === businessId)) {
        throw new ForbiddenException('Business not in this tenant');
      }
    } catch {
      throw new BadGatewayException('Business service unavailable');
    }
  }

  protected abstract getBaseUrl(): string;
  protected abstract getServiceName(): string;

  protected canWrite(roleName: string) {
    const upper = roleName.toUpperCase();
    return !['BUSINESS_OWNER', 'OWNER', 'PROJECT_MANAGER'].includes(upper);
  }

  async listByBusiness(authHeader: string, tenantIdFromHeader: string, businessId: string) {
    const tenantId = (tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined')
      ? tenantIdFromHeader
      : await this.resolveTenantIdFromBusiness(businessId);
    const ctx = await this.getContext(authHeader, tenantId);
    await this.assertBusinessInTenant(ctx.tenantId, businessId);

    const url = `${this.getBaseUrl()}/by-business/${encodeURIComponent(businessId)}`;
    const r = await fetch(url);
    if (!r.ok) throw new BadGatewayException(`${this.getServiceName()} service error`);
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

    const url = this.getBaseUrl();
    const requestedCreatedBy = (body?.createdByUserId || body?.createdBy) as string | undefined;
    let createdBy = ctx.userId;
    
    if (requestedCreatedBy) {
      const upper = ctx.roleName.toUpperCase();
      const canAssign = ['ADMIN', 'SUPER_ADMIN', 'SUPER_MANAGER', 'NIGHT_SHIFT_LEAD'].includes(upper);
      if (!canAssign) throw new ForbiddenException('Only admin can assign to another user');
      
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { tenantId: ctx.tenantId, userId: requestedCreatedBy, deletedAt: null },
        select: { id: true },
      });
      if (!membership) throw new ForbiddenException('Target user not in this company');
      createdBy = requestedCreatedBy;
    }

    const payload = { ...body, createdBy };
    delete (payload as any).createdByUserId;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new BadGatewayException(`${this.getServiceName()} service error`);
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

    const url = `${this.getBaseUrl()}/${encodeURIComponent(id)}`;
    if (body && typeof body === 'object') {
      delete body.createdBy;
      delete body.createdByUserId;
    }
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new BadGatewayException(`${this.getServiceName()} service error`);
    return r.json();
  }

  async remove(authHeader: string, tenantIdFromHeader: string, id: string) {
    const ctx = await this.getContext(authHeader, tenantIdFromHeader);
    if (!this.canWrite(ctx.roleName)) throw new ForbiddenException('Read-only for Business Owner');

    const url = `${this.getBaseUrl()}/${encodeURIComponent(id)}`;
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new BadGatewayException(`${this.getServiceName()} service error`);
    return { success: true };
  }
}
