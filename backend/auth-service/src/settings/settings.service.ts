import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  countries() {
    return [
      { code: 'TN', name: 'Tunisia', flag: '🇹🇳', currency: 'TND', taxRate: 19 },
      { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', taxRate: 20 },
      { code: 'DZ', name: 'Algeria', flag: '🇩🇿', currency: 'DZD', taxRate: 19 },
      { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD', taxRate: 20 },
      { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', taxRate: 19 },
      {
        code: 'US',
        name: 'United States',
        flag: '🇺🇸',
        currency: 'USD',
        taxRate: 0,
      },
      {
        code: 'GB',
        name: 'United Kingdom',
        flag: '🇬🇧',
        currency: 'GBP',
        taxRate: 20,
      },
      { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', taxRate: 5 },
      {
        code: 'SA',
        name: 'Saudi Arabia',
        flag: '🇸🇦',
        currency: 'SAR',
        taxRate: 15,
      },
      { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', taxRate: 13 },
      { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', taxRate: 22 },
      { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', taxRate: 21 },
    ];
  }

  categories() {
    return [
      { value: 'RETAIL', label: 'Retail & Commerce' },
      { value: 'SERVICES', label: 'Professional Services' },
      { value: 'TECH', label: 'Technology & Software' },
      { value: 'RESTAURANT', label: 'Restaurant & Food' },
      { value: 'FREELANCE', label: 'Freelance & Consulting' },
      { value: 'HEALTHCARE', label: 'Healthcare' },
      { value: 'EDUCATION', label: 'Education & Training' },
      { value: 'CONSTRUCTION', label: 'Construction & Real Estate' },
      { value: 'TRANSPORT', label: 'Transport & Logistics' },
      { value: 'OTHER', label: 'Other' },
    ];
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

    if (tenantId) {
      const m = await this.prisma.userTenantMembership.findFirst({
        where: { userId, tenantId },
      });
      if (!m) throw new UnauthorizedException('No membership found for this tenant');
      return { userId, tenantId };
    }

    // If no tenantId provided in headers, look for the first membership
    const m = await this.prisma.userTenantMembership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // Let's try the newest one first
    });
    if (!m) throw new UnauthorizedException('No memberships found');
    return { userId, tenantId: m.tenantId };
  }

  async getTenant(auth: string, tenantId?: string) {
    const { tenantId: resolvedTenantId } = await this.resolveTenant(
      auth,
      tenantId,
    );
    const base = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');
    const r = await fetch(`${base}/tenants/${resolvedTenantId}`);
    if (!r.ok) throw new UnauthorizedException();
    const t = await r.json();
    return {
      id: t?.id,
      name: t?.name,
      address: t?.address,
      slug: t?.slug,
      country: t?.country ?? '',
      logoUrl: t?.logoUrl ?? '',
      phone: t?.phone ?? '',
      matricule: t?.matricule ?? '',
      branding: t?.branding ?? {},
    };
  }

  async getAllTenants(auth: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = auth.substring('Bearer '.length);
    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });
    const userId = payload?.sub as string;
    if (!userId) throw new UnauthorizedException();

    const memberships = await this.prisma.userTenantMembership.findMany({
      where: { userId },
      select: { tenantId: true },
    });

    const tenantIds = memberships.map((m) => m.tenantId);
    const base = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');

    const tenants = await Promise.all(
      tenantIds.map(async (id) => {
        try {
          const r = await fetch(`${base}/tenants/${id}`);
          if (r.ok) return r.json();
          return null;
        } catch {
          return null;
        }
      }),
    );

    return tenants.filter((t) => t !== null);
  }

  async updateTenant(auth: string, dto: UpdateTenantDto, tenantId?: string) {
    const { tenantId: resolvedTenantId } = await this.resolveTenant(
      auth,
      tenantId,
    );
    const base = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');
    const cur = await fetch(`${base}/tenants/${resolvedTenantId}`).then((x) =>
      x.ok ? x.json() : null,
    );
    const brand = (cur?.branding ?? {}) as Record<string, any>;
    const merged = {
      ...brand,
      ...(dto.branding ?? {}),
      ...(dto.category ? { category: dto.category } : {}),
    };
    const payload: any = {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.address ? { address: dto.address } : {}),
      ...(dto.country !== undefined ? { country: dto.country ?? '' } : {}),
      ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl ?? '' } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone ?? '' } : {}),
      ...(dto.matricule !== undefined ? { matricule: dto.matricule ?? '' } : {}),
      branding: merged,
    };
    const r = await fetch(`${base}/tenants/${resolvedTenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error('Tenant update failed:', txt);
      throw new Error(txt);
    }
    const updated = await r.json();
    return { success: true, tenant: updated };
  }

  async getBusinesses(
    auth: string,
    tenantId?: string,
  ): Promise<
    Array<{ id: string; name: string; currency: string; taxRate: number; category: string }>
  > {
    const { tenantId: resolvedTenantId } = await this.resolveTenant(
      auth,
      tenantId,
    );
    const base = process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003';
    const url = `${base.replace(/\/+$/, '')}/businesses/by-tenant/${resolvedTenantId}`;
    try {
      const r = await fetch(url);
      const list = r.ok ? await r.json() : [];
      if (!Array.isArray(list)) return [];
      return list
        .filter((b: any) => !b?.deletedAt)
        .map((b: any) => ({
          id: String(b.id),
          name: String(b.name ?? ''),
          currency: String(b.currency ?? ''),
          taxRate: Number(b.taxRate ?? 0),
          category: String(b.category ?? 'Autre'),
        }));
    } catch {
      return [];
    }
  }

  async createBusiness(
    auth: string,
    dto: CreateBusinessDto,
    tenantId?: string,
  ) {
    const { tenantId: resolvedTenantId } = await this.resolveTenant(
      auth,
      tenantId,
    );
    const base = process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003';
    const url = `${base.replace(/\/+$/, '')}/businesses`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: resolvedTenantId,
        name: dto.name,
        logoUrl: dto.logoUrl ?? '',
        currency: dto.currency,
        taxRate: dto.taxRate,
        category: dto.category ?? 'Autre',
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(txt);
    }
    const b = await r.json();
    return {
      success: true,
      business: {
        id: b.id,
        name: b.name,
        currency: b.currency,
        taxRate: b.taxRate,
        category: b.category,
      },
    };
  }

  async updateBusiness(
    auth: string,
    id: string,
    dto: UpdateBusinessDto,
    tenantId?: string,
  ) {
    await this.resolveTenant(auth, tenantId);
    const base = process.env.BUSINESS_SERVICE_URL ?? 'http://localhost:3003';
    const url = `${base.replace(/\/+$/, '')}/businesses/${id}`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: dto.name,
        currency: dto.currency,
        taxRate: dto.taxRate,
        category: dto.category,
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(txt);
    }
    const b = await r.json();
    return {
      success: true,
      business: {
        id: b.id,
        name: b.name,
        currency: b.currency,
        taxRate: b.taxRate,
        category: b.category,
      },
    };
  }

  async requestTenant(auth: string, dto: any) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = auth.substring('Bearer '.length);
    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });
    const userId = payload?.sub as string;
    if (!userId) throw new UnauthorizedException();

    // Create ACTIVE tenant
    const base = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');
    const r = await fetch(`${base}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        matricule: dto.matricule,
        country: dto.country || 'TN',
        registrationStatus: 'ACTIVE',
        ownerId: userId,
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      // Surface a clearer error instead of a generic 500.
      throw new BadGatewayException({
        message: 'Tenant service request failed',
        tenantServiceUrl: `${base}/tenants`,
        status: r.status,
        body: txt,
      });
    }

    let createdTenant: any;
    try {
      createdTenant = await r.json();
    } catch {
      const txt = await r.text().catch(() => '');
      throw new InternalServerErrorException({
        message: 'Invalid JSON returned by tenant service',
        tenantServiceUrl: `${base}/tenants`,
        body: txt,
      });
    }

    // Find the OWNER role
    let role = await this.prisma.role.findFirst({
      where: { name: 'OWNER', tenantId: null as any },
    });

    // If role doesn't exist (e.g. fresh DB), create it
    if (!role) {
      role = await this.prisma.role.create({
        data: { name: 'OWNER', isStandard: true, tenantId: null as any },
      });
    }

    // Create UserTenantMembership for the owner (Manual check instead of upsert to avoid constraint errors)
    const existingMembership = await this.prisma.userTenantMembership.findFirst({
      where: {
        userId: userId,
        tenantId: createdTenant.id,
      },
    });

    if (existingMembership) {
      await this.prisma.userTenantMembership.update({
        where: { id: existingMembership.id },
        data: { roleId: role.id },
      });
    } else {
      await this.prisma.userTenantMembership.create({
        data: {
          userId: userId,
          tenantId: createdTenant.id,
          roleId: role.id,
        },
      });
    }

    return {
      success: true,
      message: 'Nouvelle entreprise créée avec succès',
    };
  }
}
