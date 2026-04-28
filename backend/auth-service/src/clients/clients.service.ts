import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private businessBase() {
    return (process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003').replace(
      /\/+$/,
      '',
    );
  }

  private async resolveTenant(
    authHeader?: string,
    tenantId?: string,
  ): Promise<{ userId: string; tenantId: string }> {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = authHeader.substring('Bearer '.length);
    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });

    const userId = payload?.sub as string;
    if (!userId) throw new UnauthorizedException();

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
    const hasElevatedJwtRole = jwtRoles
      .map((r: any) => String(r ?? '').toUpperCase())
      .some((r: string) => elevatedRoleNames.has(r));

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
      select: { id: true },
    });

    const isElevated = !!elevatedMembership || isAdminEmail || hasElevatedJwtRole;

    let tid =
      tenantId && tenantId !== 'undefined' && tenantId !== 'null' ? tenantId : null;

    if (tid && tid.includes(',')) {
      tid = tid.split(',')[0].trim();
    }

    if (tid) {
      const m = await this.prisma.userTenantMembership.findFirst({
        where: { userId, tenantId: tid, deletedAt: null },
      });
      if (!m && !isElevated) {
        throw new UnauthorizedException('No membership found for this tenant');
      }
      return { userId, tenantId: tid };
    }

    const m = await this.prisma.userTenantMembership.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!m) throw new UnauthorizedException('No memberships found');
    return { userId, tenantId: m.tenantId };
  }

  private async assertBusinessAccess(tenantId: string, businessId: string) {
    const url = `${this.businessBase()}/businesses/by-tenant/${encodeURIComponent(
      tenantId,
    )}`;

    let list: any[] = [];
    try {
      const r = await fetch(url);
      if (!r.ok) return false;
      const data = await r.json();
      list = Array.isArray(data) ? data : [];
    } catch {
      return false;
    }

    return list.some((b) => String(b?.id) === String(businessId));
  }

  async listByBusiness(auth: string, tenantId: string | undefined, businessId: string) {
    const { tenantId: resolvedTenantId } = await this.resolveTenant(auth, tenantId);
    const ok = await this.assertBusinessAccess(resolvedTenantId, businessId);
    if (!ok) throw new UnauthorizedException('Business not accessible for this tenant');

    const url = `${this.businessBase()}/clients/by-business/${encodeURIComponent(
      businessId,
    )}`;
    try {
      const r = await fetch(url, {
        headers: { 'X-Tenant-Id': resolvedTenantId },
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new BadGatewayException(txt);
      }
      return r.json();
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      if (e instanceof BadGatewayException) throw e;
      throw new BadGatewayException('Business service unavailable');
    }
  }

  async create(
    auth: string,
    tenantId: string | undefined,
    body: {
      businessId: string;
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      taxNumber?: string;
    },
  ) {
    const { tenantId: resolvedTenantId } = await this.resolveTenant(auth, tenantId);
    const ok = await this.assertBusinessAccess(resolvedTenantId, body.businessId);
    if (!ok) throw new UnauthorizedException('Business not accessible for this tenant');

    const url = `${this.businessBase()}/clients`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': resolvedTenantId,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const txt = await r.text();
      throw new BadGatewayException(txt);
    }

    return r.json();
  }

  private async getClientFromBusinessService(id: string, tenantId: string) {
    const url = `${this.businessBase()}/clients/${encodeURIComponent(id)}`;
    const r = await fetch(url, {
      headers: { 'X-Tenant-Id': tenantId },
    });
    if (r.status === 404) throw new NotFoundException('Client not found');
    if (!r.ok) {
      const txt = await r.text();
      throw new BadGatewayException(txt);
    }
    return r.json();
  }

  async get(auth: string, tenantId: string | undefined, id: string) {
    const { tenantId: resolvedTenantId } = await this.resolveTenant(auth, tenantId);
    const client = await this.getClientFromBusinessService(id, resolvedTenantId);
    const ok = await this.assertBusinessAccess(resolvedTenantId, String(client?.businessId));
    if (!ok) throw new UnauthorizedException('Client not accessible for this tenant');
    return client;
  }

  async update(
    auth: string,
    tenantId: string | undefined,
    id: string,
    body: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      taxNumber?: string;
    },
  ) {
    const { tenantId: resolvedTenantId } = await this.resolveTenant(auth, tenantId);
    const client = await this.getClientFromBusinessService(id, resolvedTenantId);
    const ok = await this.assertBusinessAccess(resolvedTenantId, String(client?.businessId));
    if (!ok) throw new UnauthorizedException('Client not accessible for this tenant');

    const url = `${this.businessBase()}/clients/${encodeURIComponent(id)}`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': resolvedTenantId,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const txt = await r.text();
      throw new BadGatewayException(txt);
    }

    return r.json();
  }

  async remove(auth: string, tenantId: string | undefined, id: string) {
    const { tenantId: resolvedTenantId } = await this.resolveTenant(auth, tenantId);
    const client = await this.getClientFromBusinessService(id, resolvedTenantId);
    const ok = await this.assertBusinessAccess(resolvedTenantId, String(client?.businessId));
    if (!ok) throw new UnauthorizedException('Client not accessible for this tenant');

    const url = `${this.businessBase()}/clients/${encodeURIComponent(id)}`;
    const r = await fetch(url, {
      method: 'DELETE',
      headers: { 'X-Tenant-Id': resolvedTenantId },
    });

    if (!r.ok) {
      const txt = await r.text();
      throw new BadGatewayException(txt);
    }

    return { success: true };
  }
}
