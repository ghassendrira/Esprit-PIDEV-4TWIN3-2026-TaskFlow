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
  ): Promise<{ userId: string; tenantId: string; roleName: string }> {
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

    const elevatedRoleNames = new Set([
      'SUPER_ADMIN',
      'ROLE_SUPER_ADMIN',
      'SUPER_MANAGER',
      'ROLE_SUPER_MANAGER',
      'ADMIN',
      'ROLE_ADMIN',
      'NIGHT_SHIFT_LEAD',
      'ROLE_NIGHT_SHIFT_LEAD',
      'BUSINESS_OWNER',
      'ROLE_BUSINESS_OWNER',
      'OWNER',
      'ROLE_OWNER',
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
        include: { role: true },
      });
      if (!m && !isElevated) {
        throw new UnauthorizedException('No membership found for this tenant');
      }
      const roleName = m?.role?.name ?? 'ROLE_USER';
      return { userId, tenantId: tid, roleName };
    }

    const m = await this.prisma.userTenantMembership.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { role: true },
    });
    if (!m) throw new UnauthorizedException('No memberships found');
    const roleName = m.role?.name ?? 'ROLE_USER';
    return { userId, tenantId: m.tenantId, roleName };
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
    const { tenantId: resolvedTenantId, userId, roleName } = await this.resolveTenant(
      auth,
      tenantId,
    );
    
    // Check if user is Super Admin for bypass
    const superAdminRole = await this.prisma.role.findFirst({
      where: { name: { in: ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN'] } }
    });
    const isSuperAdmin = superAdminRole ? await this.prisma.userTenantMembership.findFirst({
      where: { userId, roleId: superAdminRole.id, deletedAt: null }
    }) : null;

    if (!isSuperAdmin) {
      const ok = await this.assertBusinessAccess(resolvedTenantId, businessId);
      if (!ok) throw new UnauthorizedException('Business not accessible for this tenant');
    } else {
      console.log(`[Clients] SUPER_ADMIN bypass for business ${businessId}`);
    }

    const url = `${this.businessBase()}/clients/by-business/${encodeURIComponent(
      businessId,
    )}`;
    try {
      const r = await fetch(url, {
        headers: {
          Authorization: auth,
          'X-Tenant-Id': resolvedTenantId,
          'X-User-Id': userId,
          'X-User-Role': roleName,
        },
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
    const { tenantId: resolvedTenantId, userId, roleName } = await this.resolveTenant(
      auth,
      tenantId,
    );
    const ok = await this.assertBusinessAccess(resolvedTenantId, body.businessId);
    if (!ok) throw new UnauthorizedException('Business not accessible for this tenant');

    const url = `${this.businessBase()}/clients`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
        'X-Tenant-Id': resolvedTenantId,
        'X-User-Id': userId,
        'X-User-Role': roleName,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const txt = await r.text();
      throw new BadGatewayException(txt);
    }

    return r.json();
  }

  private async getClientFromBusinessService(id: string, tenantId: string, roleName: string, auth: string, userId: string) {
    const url = `${this.businessBase()}/clients/${encodeURIComponent(id)}`;
    const r = await fetch(url, {
      headers: {
        Authorization: auth,
        'X-Tenant-Id': tenantId,
        'X-User-Id': userId,
        'X-User-Role': roleName,
      },
    });
    if (r.status === 404) throw new NotFoundException('Client not found');
    if (!r.ok) {
      const txt = await r.text();
      throw new BadGatewayException(txt);
    }
    return r.json();
  }

  async get(auth: string, tenantId: string | undefined, id: string) {
    const { tenantId: resolvedTenantId, userId, roleName } = await this.resolveTenant(auth, tenantId);
    const client = await this.getClientFromBusinessService(id, resolvedTenantId, roleName, auth, userId);
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
    const { tenantId: resolvedTenantId, userId, roleName } = await this.resolveTenant(auth, tenantId);
    const client = await this.getClientFromBusinessService(id, resolvedTenantId, roleName, auth, userId);
    const ok = await this.assertBusinessAccess(resolvedTenantId, String(client?.businessId));
    if (!ok) throw new UnauthorizedException('Client not accessible for this tenant');

    const url = `${this.businessBase()}/clients/${encodeURIComponent(id)}`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
        'X-Tenant-Id': resolvedTenantId,
        'X-User-Id': userId,
        'X-User-Role': roleName,
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
    const { tenantId: resolvedTenantId, userId, roleName } = await this.resolveTenant(auth, tenantId);
    const client = await this.getClientFromBusinessService(id, resolvedTenantId, roleName, auth, userId);
    const ok = await this.assertBusinessAccess(resolvedTenantId, String(client?.businessId));
    if (!ok) throw new UnauthorizedException('Client not accessible for this tenant');

    const url = `${this.businessBase()}/clients/${encodeURIComponent(id)}`;
    const r = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: auth,
        'X-Tenant-Id': resolvedTenantId,
        'X-User-Id': userId,
        'X-User-Role': roleName,
      },
    });

    if (!r.ok) {
      const txt = await r.text();
      throw new BadGatewayException(txt);
    }

    return { success: true };
  }
}
