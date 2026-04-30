import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class InvoicesProxyService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private normalizeRoleName(role: unknown): string {
    return String(role ?? '')
      .trim()
      .replace(/^ROLE_/, '')
      .toUpperCase();
  }

  private elevatedAccessRoles(): string[] {
    return ['SUPER_ADMIN', 'SUPER_MANAGER', 'ADMIN', 'NIGHT_SHIFT_LEAD'];
  }

  private resolveElevatedRoleName(
    membershipRoleName: string | null | undefined,
    normalizedJwtRoles: string[],
  ): string {
    const elevated = new Set(this.elevatedAccessRoles());
    const membershipRole = this.normalizeRoleName(membershipRoleName);
    if (elevated.has(membershipRole)) return membershipRole;

    return normalizedJwtRoles.find((role) => elevated.has(role)) ?? 'SUPER_ADMIN';
  }

  private async getContext(authHeader?: string, tenantIdFromHeader?: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    let auth = authHeader.trim();
    if (auth.includes(',')) {
      auth = auth.split(',')[0].trim();
    }
    
    const parts = auth.split(/\s+/);
    if (parts.length < 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Malformed Authorization header (no Bearer prefix)');
    }

    const token = parts.slice(1).join(' ').trim();

    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      throw new UnauthorizedException('Invalid or empty token');
    }

    let payload;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'change-me',
      });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Invalid token');
    }

    const userId = payload?.sub as string;
    if (!userId) throw new UnauthorizedException();

    let tenantId = tenantIdFromHeader && tenantIdFromHeader !== 'null' && tenantIdFromHeader !== 'undefined'
      ? tenantIdFromHeader
      : null;

    if (tenantId && tenantId.includes(',')) {
      tenantId = tenantId.split(',')[0].trim();
    }

    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');

    const elevatedRoleNames = this.elevatedAccessRoles();
    const elevatedRoleSet = new Set(elevatedRoleNames);

    const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
    const email = String(payload?.email ?? '').trim().toLowerCase();
    const isAdminEmail = !!adminEmail && !!email && email === adminEmail;

    const jwtRoles = Array.isArray(payload?.roles) ? payload.roles : [];
    const normalizedJwtRoles = jwtRoles.map((r: any) => this.normalizeRoleName(r));
    const hasElevatedJwtRole = normalizedJwtRoles.some((r: string) => elevatedRoleSet.has(r));

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
      where: {
        userId,
        tenantId,
        deletedAt: null,
      },
      include: { role: true },
    });

    if (!membership) {
      if (!isElevated) throw new ForbiddenException('No membership for this company');

      // Treat elevated users as admin for the target tenant.
      const roleName = this.resolveElevatedRoleName(
        elevatedMembership?.role?.name,
        normalizedJwtRoles,
      );

      return { userId, tenantId, roleName };
    }

    if (isElevated) {
      const elevatedRoleName = this.resolveElevatedRoleName(
        elevatedMembership?.role?.name,
        normalizedJwtRoles,
      );
      return { userId, tenantId, roleName: elevatedRoleName };
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
    const upper = this.normalizeRoleName(roleName);
    if (upper === 'BUSINESS_OWNER' || upper === 'OWNER' || upper === 'PROJECT_MANAGER') return false;
    return true; // ADMIN + EMPLOYÉS + SUPER_ADMIN etc.
  }

  private canAssignToOtherUser(roleName: string) {
    const upper = this.normalizeRoleName(roleName);
    return upper === 'ADMIN' || upper === 'SUPER_ADMIN' || upper === 'SUPER_MANAGER' || upper === 'NIGHT_SHIFT_LEAD';
  }

  private async resolveEffectiveEmployeeUserId(
    tenantId: string,
    currentUserId: string,
    roleName: string,
    requestedEmployeeUserId?: string,
  ): Promise<string | undefined> {
    const normalizedRequested = String(requestedEmployeeUserId ?? '').trim();
    const elevated = new Set(this.elevatedAccessRoles());
    const normalizedRole = this.normalizeRoleName(roleName);
    const isElevated = elevated.has(normalizedRole);

    if (!isElevated) {
      return currentUserId;
    }

    if (!normalizedRequested) {
      return undefined;
    }

    const membership = await this.prisma.userTenantMembership.findFirst({
      where: {
        userId: normalizedRequested,
        tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new UnauthorizedException('Target user not in this company');
    }

    return normalizedRequested;
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
    const bId = String(businessId).toLowerCase();
    const ok =
      Array.isArray(list) &&
      list.some((b) => String(b.id).toLowerCase() === bId);
    if (!ok) throw new ForbiddenException('Business not in this tenant');
  }

  private invoiceBase() {
    return (process.env.INVOICE_SERVICE_URL ?? 'http://localhost:3005').replace(/\/+$/, '');
  }

  async listByBusiness(
    authHeader: string,
    tenantIdFromHeader: string | undefined,
    businessId: string,
    employeeUserId?: string,
  ) {
    const tenantId =
      tenantIdFromHeader &&
      tenantIdFromHeader !== 'null' &&
      tenantIdFromHeader !== 'undefined'
        ? tenantIdFromHeader
        : await this.resolveTenantIdFromBusiness(businessId);

    const ctx = await this.getContext(authHeader, tenantId);
    
    // Bypass tenant/business cross-check for Super Admins
    if (this.normalizeRoleName(ctx.roleName) === 'SUPER_ADMIN') {
      console.log(`[Invoices] SUPER_ADMIN bypass for business ${businessId}`);
    } else {
      await this.assertBusinessInTenant(ctx.tenantId, businessId);
    }

    const effectiveEmployeeUserId = await this.resolveEffectiveEmployeeUserId(
      ctx.tenantId,
      ctx.userId,
      ctx.roleName,
      employeeUserId,
    );

    const url = `${this.invoiceBase()}/invoices/by-business/${encodeURIComponent(businessId)}`;
    let r: Response;
    let txt = '';
    try {
      r = await fetch(url, {
        headers: {
          Authorization: authHeader,
          'X-Tenant-Id': ctx.tenantId,
          'X-User-Id': ctx.userId,
          'X-User-Role': ctx.roleName,
          ...(effectiveEmployeeUserId
            ? { 'X-Employee-User-Id': effectiveEmployeeUserId }
            : {}),
        },
      });
      txt = await r.text();
    } catch {
      throw new BadGatewayException('Invoice service unavailable');
    }
    if (!r.ok) {
      if (r.status === 400)
        throw new BadRequestException(txt || 'Invalid input for invoice service');
      if (r.status === 401)
        throw new UnauthorizedException(txt || 'Invoice service unauthorized');
      if (r.status === 403)
        throw new ForbiddenException(txt || 'Invoice service forbidden');
      if (r.status === 404)
        throw new NotFoundException(txt || 'Invoice not found');
      throw new BadGatewayException(txt || 'Invoice service error');
    }
    try {
      return JSON.parse(txt);
    } catch {
      throw new BadGatewayException('Invalid response from invoice service');
    }
  }

  async create(
    authHeader: string,
    tenantIdFromHeader: string | undefined,
    body: any,
  ) {
    const businessId = body?.businessId as string;
    const tenantId =
      tenantIdFromHeader &&
      tenantIdFromHeader !== 'null' &&
      tenantIdFromHeader !== 'undefined'
        ? tenantIdFromHeader
        : businessId
          ? await this.resolveTenantIdFromBusiness(businessId)
          : null;

    const ctx = await this.getContext(authHeader, tenantId ?? undefined);
    if (!this.canWrite(ctx.roleName))
      throw new ForbiddenException('Read-only for Business Owner');

    if (!businessId) throw new BadRequestException('businessId is required');
    await this.assertBusinessInTenant(ctx.tenantId, businessId);

    const url = `${this.invoiceBase()}/invoices`;

    const requestedCreatedBy = (body?.createdByUserId ||
      body?.createdBy) as string | undefined;
    let createdBy = ctx.userId;
    if (requestedCreatedBy) {
      if (!this.canAssignToOtherUser(ctx.roleName))
        throw new ForbiddenException('Only admin can assign to another user');
      await this.assertUserInTenant(ctx.tenantId, requestedCreatedBy);
      createdBy = requestedCreatedBy;
    }

    const finalBody = {
      ...body,
      tenantId: ctx.tenantId,
      createdBy,
      createdByUserId: createdBy,
    };

    let r: Response;
    let txt = '';
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Tenant-Id': ctx.tenantId,
          'X-User-Id': ctx.userId,
          'X-User-Role': ctx.roleName,
        },
        body: JSON.stringify(finalBody),
      });
      txt = await r.text();
    } catch {
      throw new BadGatewayException('Invoice service unavailable');
    }
    if (!r.ok) {
      if (r.status === 400)
        throw new BadRequestException(txt || 'Invalid input for invoice service');
      throw new BadGatewayException(txt || 'Invoice service error');
    }
    try {
      return JSON.parse(txt);
    } catch {
      throw new BadGatewayException('Invalid response from invoice service');
    }
  }

  async update(
    authHeader: string,
    tenantIdFromHeader: string | undefined,
    id: string,
    body: any,
  ) {
    const ctx = await this.getContext(authHeader, tenantIdFromHeader);
    if (!this.canWrite(ctx.roleName))
      throw new ForbiddenException('Read-only for Business Owner');

    const url = `${this.invoiceBase()}/invoices/${encodeURIComponent(id)}`;
    let r: Response;
    let txt = '';
    try {
      r = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Tenant-Id': ctx.tenantId,
          'X-User-Id': ctx.userId,
          'X-User-Role': ctx.roleName,
        },
        body: JSON.stringify(body),
      });
      txt = await r.text();
    } catch {
      throw new BadGatewayException('Invoice service unavailable');
    }
    if (!r.ok) {
      if (r.status === 400)
        throw new BadRequestException(txt || 'Invalid input for invoice service');
      if (r.status === 404) throw new NotFoundException(txt || 'Invoice not found');
      throw new BadGatewayException(txt || 'Invoice service error');
    }
    try {
      return JSON.parse(txt);
    } catch {
      throw new BadGatewayException('Invalid response from invoice service');
    }
  }

  async remove(
    authHeader: string,
    tenantIdFromHeader: string | undefined,
    id: string,
  ) {
    const ctx = await this.getContext(authHeader, tenantIdFromHeader);
    if (!this.canWrite(ctx.roleName))
      throw new ForbiddenException('Read-only for Business Owner');

    const url = `${this.invoiceBase()}/invoices/${encodeURIComponent(id)}`;
    let r: Response;
    let txt = '';
    try {
      r = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: authHeader,
          'X-Tenant-Id': ctx.tenantId,
          'X-User-Id': ctx.userId,
          'X-User-Role': ctx.roleName,
        },
      });
      txt = await r.text();
    } catch {
      throw new BadGatewayException('Invoice service unavailable');
    }
    if (!r.ok) {
      if (r.status === 404) throw new NotFoundException(txt || 'Invoice not found');
      throw new BadGatewayException(txt || 'Invoice service error');
    }
    try {
      return JSON.parse(txt);
    } catch {
      return { success: true };
    }
  }

  async getById(
    authHeader: string,
    tenantIdFromHeader: string | undefined,
    id: string,
  ) {
    const ctx = await this.getContext(authHeader, tenantIdFromHeader);
    const url = `${this.invoiceBase()}/invoices/${encodeURIComponent(id)}`;
    let r: Response;
    let txt = '';
    try {
      r = await fetch(url, {
        headers: {
          Authorization: authHeader,
          'X-Tenant-Id': ctx.tenantId,
          'X-User-Id': ctx.userId,
          'X-User-Role': ctx.roleName,
        },
      });
      txt = await r.text();
    } catch {
      throw new BadGatewayException('Invoice service unavailable');
    }
    if (!r.ok) {
      if (r.status === 404) throw new NotFoundException(txt || 'Invoice not found');
      throw new BadGatewayException(txt || 'Invoice service error');
    }
    try {
      return JSON.parse(txt);
    } catch {
      throw new BadGatewayException('Invalid response from invoice service');
    }
  }

  async sendByEmail(
    authHeader: string,
    tenantIdFromHeader: string | undefined,
    id: string,
  ) {
    const ctx = await this.getContext(authHeader, tenantIdFromHeader);
    const url = `${this.invoiceBase()}/invoices/${encodeURIComponent(id)}/send`;
    let r: Response;
    let txt = '';
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'X-Tenant-Id': ctx.tenantId,
          'X-User-Id': ctx.userId,
          'X-User-Role': ctx.roleName,
        },
      });
      txt = await r.text();
    } catch {
      throw new BadGatewayException('Invoice service unavailable');
    }
    if (!r.ok) {
      throw new BadGatewayException(txt || 'Invoice service error');
    }
    try {
      return JSON.parse(txt);
    } catch {
      return { success: true };
    }
  }
}
