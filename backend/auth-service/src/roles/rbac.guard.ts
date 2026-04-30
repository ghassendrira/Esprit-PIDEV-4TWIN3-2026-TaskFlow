import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private normalizeTenantId(value: unknown): string | null {
    if (Array.isArray(value)) value = value[0];
    if (value === null || value === undefined) return null;
    const v = String(value).trim();
    if (!v || v === 'null' || v === 'undefined') return null;
    return v;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let authHeader = request.headers.authorization;

    if (authHeader && Array.isArray(authHeader)) {
      authHeader = authHeader[0];
    } else if (authHeader && authHeader.includes(',')) {
      authHeader = authHeader.split(',')[0].trim();
    }

    console.log(`[RBACGuard] Incoming Authorization Header: ${authHeader ? 'Present' : 'MISSING'}`);

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const auth = authHeader.trim();
    const parts = auth.split(/\s+/);
    if (parts.length < 2 || parts[0].toLowerCase() !== 'bearer') {
      console.warn(`[RBACGuard] Invalid Header Format: ${auth}`);
      throw new UnauthorizedException('Malformed Authorization header (no Bearer prefix)');
    }

    const token = parts.slice(1).join(' ').trim();
    console.log(`[RBACGuard] Extracted Token: ${token.substring(0, 15)}...`);
    
    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      console.error(`[RBACGuard] Invalid Token String detected: "${token}"`);
      throw new UnauthorizedException('Invalid or empty token');
    }

    let payload;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'change-me',
      });
      console.log(`[RBACGuard] Decoded Payload:`, { sub: payload.sub, email: payload.email, roles: payload.roles });
      request.user = payload;
    } catch (err: any) {
      console.error(`[RBACGuard] JWT Verification failed: ${err.message}`, { token: token.substring(0, 10) + '...' });
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Malformed JWT token');
      }
      throw new UnauthorizedException('Invalid token');
    }

    const userId = payload.sub;
    
    const headerTenantId = this.normalizeTenantId(request.headers['x-tenant-id']);
    const payloadTenantId = this.normalizeTenantId(payload.tenantId);
    const payloadCompanyId = this.normalizeTenantId(payload.company_id);

    const tenantCandidates = [...new Set([headerTenantId, payloadTenantId, payloadCompanyId].filter(Boolean))] as string[];

    if (!userId) {
      throw new ForbiddenException('User or Tenant context missing');
    }

    // Super Admin bypass: if user has SUPER_ADMIN role in ANY tenant context, allow all.
    const globalSuperAdmin = await this.prisma.userTenantMembership.findFirst({
      where: {
        userId,
        deletedAt: null,
        role: {
          name: {
            in: ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN'],
          },
        },
      },
      select: { id: true },
    });

    if (globalSuperAdmin) {
      // eslint-disable-next-line no-console
      console.log(`[RBACGuard] Super Admin global bypass triggered`);
      return true;
    }

    let resolvedTenantId: string | null = null;
    let memberships: any[] = [];

    // 1) Try header/payload candidates in order
    for (const tenantId of tenantCandidates) {
      const candidateMemberships = await this.prisma.userTenantMembership.findMany({
        where: {
          userId,
          tenantId,
          deletedAt: null,
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (candidateMemberships.length > 0) {
        memberships = candidateMemberships;
        resolvedTenantId = tenantId;
        break;
      }
    }

    // 2) Fallback to latest membership tenant if provided tenant context is stale/invalid
    if (!resolvedTenantId) {
      const latestMembership = await this.prisma.userTenantMembership.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { tenantId: true },
      });

      if (latestMembership?.tenantId) {
        const candidateMemberships = await this.prisma.userTenantMembership.findMany({
          where: {
            userId,
            tenantId: latestMembership.tenantId,
            deletedAt: null,
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        if (candidateMemberships.length > 0) {
          memberships = candidateMemberships;
          resolvedTenantId = latestMembership.tenantId;
          request.headers['x-tenant-id'] = resolvedTenantId;
        }
      }
    }

    const userPermissions = memberships.flatMap(m => 
      m.role.permissions.map(rp => rp.permission.name)
    );

    console.log(`[RBACGuard] User: ${userId} | Tenant: ${resolvedTenantId ?? 'UNRESOLVED'}`);
    console.log(`[RBACGuard] Required: ${requiredPermissions.join(', ')}`);
    console.log(`[RBACGuard] User has: ${userPermissions.join(', ')}`);

    // Check if user has ALL required permissions
    const missingPermissions = requiredPermissions.filter(p => !userPermissions.includes(p));
    
    if (missingPermissions.length > 0) {
      console.log(`[RBACGuard] Missing: ${missingPermissions.join(', ')}`);
      throw new ForbiddenException(`Insufficient permissions. Missing: ${missingPermissions.join(', ')}`);
    }

    return true;
  }
}
