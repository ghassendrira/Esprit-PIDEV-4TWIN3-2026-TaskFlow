import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  private async makeUniqueSlug(base: string): Promise<string> {
    const cleanBase = slugify(base || 'tenant');
    // Try base, then base-2..base-50
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? cleanBase : `${cleanBase}-${i + 1}`;
      const exists = await this.prisma.tenant.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    // Fallback random suffix (very unlikely)
    const rand = Math.random().toString(36).slice(2, 8);
    return `${cleanBase}-${rand}`;
  }

  async create(data: {
    name: string;
    slug?: string;
    address?: string;
    country?: string;
    phone?: string;
    logoUrl?: string;
    branding?: Record<string, any>;
  }) {
    const desired = data.slug ? slugify(data.slug) : slugify(data.name);
    const slug = await this.makeUniqueSlug(desired);

    const created = await this.prisma.tenant.create({
      data: {
        name: data.name,
        slug,
        address: data.address ?? '',
        country: data.country ?? '',
        phone: data.phone ?? '',
        logoUrl: data.logoUrl ?? '',
        branding: data.branding ?? {},
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        country: true,
        phone: true,
        matricule: true,
        logoUrl: true,
        website: true,
        branding: true,
      },
    });
    return created;
  }

  async findById(id: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        country: true,
        phone: true,
        logoUrl: true,
        matricule: true,
        branding: true,
      },
    });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async findByName(name: string) {
    const t = await this.prisma.tenant.findFirst({
      where: { name },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        matricule: true,
        branding: true,
      },
    });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      address: string;
      country: string;
      phone: string;
      matricule: string;
      logoUrl: string;
      website: string;
      branding: Record<string, any>;
    }>,
  ) {
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.slug ? { slug: slugify(data.slug) } : {}),
        ...(data.address ? { address: data.address } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.matricule !== undefined ? { matricule: data.matricule } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.website !== undefined ? { website: data.website } : {}),
        ...(data.branding ? { branding: data.branding } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        country: true,
        phone: true,
        logoUrl: true,
        matricule: true,
        branding: true,
      },
    });
    return updated;
  }
}
