import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ExpensesProxyService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async getContext(authHeader?: string, tenantIdFromHeader?: string) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = authHeader.substring('Bearer '.length);

    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });

    const userId = payload?.sub as string;
    if (!userId) throw new UnauthorizedException();

    const tenantId = tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined'
      ? tenantIdFromHeader
      : null;

    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');

    const elevatedRoleNames = new Set([
      'SUPER_ADMIN',
      'SUPER_MANAGER',
      'ADMIN',
      'NIGHT_SHIFT_LEAD',
    ]);

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
        role: {
          name: {
            in: Array.from(elevatedRoleNames),
          },
        },
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

  private async resolveTenantIdFromBusiness(businessId: string) {
    const base = (process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003').replace(/\/+$/, '');
    const url = `${base}/businesses/${encodeURIComponent(businessId)}`;

    let r: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      r = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
    } catch {
      throw new BadGatewayException('Business service unavailable');
    }

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new BadGatewayException(txt || 'Business service error');
    }

    const business = (await r.json()) as { tenantId?: string | null } | null;
    const tenantId = business?.tenantId;
    if (!tenantId) throw new BadRequestException('Unable to resolve tenant for business');
    return tenantId;
  }

  private canWrite(roleName: string) {
    const upper = roleName.toUpperCase();
    if (upper === 'BUSINESS_OWNER' || upper === 'OWNER' || upper === 'PROJECT_MANAGER') return false;
    return true;
  }

  private canAssignToOtherUser(roleName: string) {
    const upper = roleName.toUpperCase();
    return upper === 'ADMIN' || upper === 'SUPER_ADMIN' || upper === 'SUPER_MANAGER' || upper === 'NIGHT_SHIFT_LEAD';
  }

  private async assertUserInTenant(tenantId: string, userId: string) {
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Target user not in this company');
  }

  private async assertBusinessInTenant(tenantId: string, businessId: string) {
    const base = (process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003').replace(/\/+$/, '');
    const url = `${base}/businesses/by-tenant/${encodeURIComponent(tenantId)}`;

    let r: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      r = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
    } catch {
      throw new BadGatewayException('Business service unavailable');
    }

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new BadGatewayException(txt || 'Business service error');
    }

    const list = (await r.json()) as Array<{ id: string }>;
    const ok = Array.isArray(list) && list.some((b) => b.id === businessId);
    if (!ok) throw new ForbiddenException('Business not in this tenant');
  }

  private expenseBase() {
    return (process.env.EXPENSE_SERVICE_URL ?? 'http://localhost:3006').replace(/\/+$/, '');
  }

  async listByBusiness(authHeader: string, tenantIdFromHeader: string, businessId: string) {
    const tenantId = tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined'
      ? tenantIdFromHeader
      : await this.resolveTenantIdFromBusiness(businessId);
    const ctx = await this.getContext(authHeader, tenantId);
    await this.assertBusinessInTenant(ctx.tenantId, businessId);

    const url = `${this.expenseBase()}/expenses/by-business/${encodeURIComponent(businessId)}`;
    let r: Response;
    let txt = '';
    try {
      r = await fetch(url);
      txt = await r.text();
    } catch {
      throw new BadGatewayException('Expense service unavailable');
    }
    if (!r.ok) throw new BadGatewayException(txt || 'Expense service error');
    try {
      return JSON.parse(txt);
    } catch {
      throw new BadGatewayException('Invalid response from expense service');
    }
  }

  async create(authHeader: string, tenantIdFromHeader: string, body: any) {
    const businessId = body?.businessId as string;
    const tenantId = tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined'
      ? tenantIdFromHeader
      : businessId
        ? await this.resolveTenantIdFromBusiness(businessId)
        : null;
    const ctx = await this.getContext(authHeader, tenantId ?? undefined);
    if (!this.canWrite(ctx.roleName)) throw new ForbiddenException('Read-only for Business Owner');

    if (!businessId) throw new BadRequestException('businessId is required');
    await this.assertBusinessInTenant(ctx.tenantId, businessId);

    const url = `${this.expenseBase()}/expenses`;

    const requestedCreatedBy = (body?.createdByUserId || body?.createdBy) as string | undefined;
    let createdBy = ctx.userId;
    if (requestedCreatedBy) {
      if (!this.canAssignToOtherUser(ctx.roleName)) throw new ForbiddenException('Only admin can assign to another user');
      await this.assertUserInTenant(ctx.tenantId, requestedCreatedBy);
      createdBy = requestedCreatedBy;
    }

    const payload = {
      ...body,
      createdBy,
    };
    delete (payload as any).createdByUserId;

    let r: Response;
    let txt = '';
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      txt = await r.text();
    } catch {
      throw new BadGatewayException('Expense service unavailable');
    }
    if (!r.ok) throw new BadGatewayException(txt || 'Expense service error');
    try {
      return JSON.parse(txt);
    } catch {
      throw new BadGatewayException('Invalid response from expense service');
    }
  }

  async update(authHeader: string, tenantIdFromHeader: string, id: string, body: any) {
    const businessId = body?.businessId as string | undefined;
    const tenantId = tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined'
      ? tenantIdFromHeader
      : businessId
        ? await this.resolveTenantIdFromBusiness(businessId)
        : null;
    const ctx = await this.getContext(authHeader, tenantId ?? undefined);
    if (!this.canWrite(ctx.roleName)) throw new ForbiddenException('Read-only for Business Owner');

    if (businessId) await this.assertBusinessInTenant(ctx.tenantId, businessId);

    const url = `${this.expenseBase()}/expenses/${encodeURIComponent(id)}`;
    // Never allow changing createdBy through the proxy.
    if (body && typeof body === 'object') {
      delete body.createdBy;
      delete body.createdByUserId;
    }
    let r: Response;
    let txt = '';
    try {
      r = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      txt = await r.text();
    } catch {
      throw new BadGatewayException('Expense service unavailable');
    }
    if (!r.ok) throw new BadGatewayException(txt || 'Expense service error');
    try {
      return JSON.parse(txt);
    } catch {
      throw new BadGatewayException('Invalid response from expense service');
    }
  }

  async remove(authHeader: string, tenantIdFromHeader: string, id: string) {
    const ctx = await this.getContext(authHeader, tenantIdFromHeader);
    if (!this.canWrite(ctx.roleName)) throw new ForbiddenException('Read-only for Business Owner');

    const url = `${this.expenseBase()}/expenses/${encodeURIComponent(id)}`;
    const r = await fetch(url, { method: 'DELETE' });
    const txt = await r.text();
    if (!r.ok) throw new BadGatewayException(txt || 'Expense service error');
    return txt ? JSON.parse(txt) : { success: true };
  }
}
