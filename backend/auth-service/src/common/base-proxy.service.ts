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

  protected canWrite(roleName: string) {
    const upper = roleName.toUpperCase();
    return !['BUSINESS_OWNER', 'OWNER', 'PROJECT_MANAGER'].includes(upper);
  }
}
