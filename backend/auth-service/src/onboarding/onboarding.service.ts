import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CompanySetupDto } from './dto/company-setup.dto';
import { CreateBusinessDto } from './dto/create-business.dto';

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async resolveTenantIdFromAuth(
    authHeader?: string,
    tenantId?: string,
  ): Promise<{ userId: string; tenantId: string }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }
    const token = authHeader.substring('Bearer '.length);
    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });
    const userId = payload?.sub as string;
    if (!userId) throw new UnauthorizedException('Invalid token payload');

    if (tenantId) {
      const m = await this.prisma.userTenantMembership.findFirst({
        where: { userId, tenantId },
      });
      if (m) return { userId, tenantId };
    }

    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId },
    });
    if (!membership) throw new UnauthorizedException('No tenant membership');
    return { userId, tenantId: membership.tenantId };
  }

  async companySetup(
    authHeader: string,
    dto: CompanySetupDto,
    tenantId?: string,
  ) {
    const { tenantId: resolvedTenantId } = await this.resolveTenantIdFromAuth(
      authHeader,
      tenantId,
    );
    const base = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');
    // Fetch current tenant to merge fields
    const current = await fetch(`${base}/tenants/${resolvedTenantId}`).then(
      (r) => (r.ok ? r.json() : null),
    );
    const branding: Record<string, any> = {
      ...((current?.branding ?? {}) as Record<string, any>),
    };
    const payload: any = {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.address ? { address: dto.address } : {}),
      ...(dto.slug ? { slug: slugify(dto.slug) } : {}),
      country: dto.country ?? '',
      phone: dto.phone ?? '',
      logoUrl: dto.logoUrl ?? '',
      branding,
    };
    const r = await fetch(`${base}/tenants/${resolvedTenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Tenant update failed: ${txt}`);
    }
    const updated = await r.json();
    return { success: true, tenant: updated };
  }

  async createBusiness(
    authHeader: string,
    dto: CreateBusinessDto,
    tenantId?: string,
  ) {
    const { tenantId: resolvedTenantId } = await this.resolveTenantIdFromAuth(
      authHeader,
      tenantId,
    );
    const tbase = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');
    const tenant = await fetch(`${tbase}/tenants/${resolvedTenantId}`).then(
      (r) => (r.ok ? r.json() : null),
    );
    const url = process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003';
    const endpoint = `${url.replace(/\/+$/, '')}/businesses`;
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: resolvedTenantId,
        name: dto.name,
        currency: dto.currency,
        taxRate: dto.taxRate,
      }),
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Business creation failed: ${text}`);
    }
    const business = await r.json();
    return {
      success: true,
      business: {
        id: business.id,
        name: business.name,
        currency: business.currency,
        taxRate: business.taxRate,
      },
      tenantSlug: tenant?.slug ?? '',
    };
  }

  async status(authHeader: string, tenantId?: string) {
    const { tenantId: resolvedTenantId } = await this.resolveTenantIdFromAuth(
      authHeader,
      tenantId,
    );
    const tbase = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');
    const tenant = await fetch(`${tbase}/tenants/${resolvedTenantId}`).then(
      (r) => (r.ok ? r.json() : null),
    );
    const url = process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003';
    const endpoint = `${url.replace(/\/+$/, '')}/businesses/count-by-tenant/${resolvedTenantId}`;
    try {
      const r = await fetch(endpoint, { method: 'GET' });
      const data = r.ok ? await r.json() : { count: 0 };
      return {
        isSetupCompleted: (data.count ?? 0) > 0,
        tenantSlug: tenant?.slug ?? '',
      };
    } catch {
      return { isSetupCompleted: false, tenantSlug: tenant?.slug ?? '' };
    }
  }
}
