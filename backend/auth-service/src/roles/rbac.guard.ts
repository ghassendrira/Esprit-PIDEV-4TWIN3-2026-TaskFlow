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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.substring('Bearer '.length);
    let payload;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'change-me',
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const userId = payload.sub;
    
    // Prioritize x-tenant-id header, then fallback to payload
    const tenantId = request.headers['x-tenant-id'] || payload.tenantId || payload.company_id;

    if (!userId || !tenantId) {
      throw new ForbiddenException('User or Tenant context missing');
    }

    // Super Admin bypass: if user has SUPER_ADMIN role in ANY tenant context, allow all.
    // The previous implementation only checked memberships within the current tenant.
    const globalSuperAdmin = await this.prisma.userTenantMembership.findFirst({
      where: {
        userId,
        deletedAt: null,
        role: {
          name: 'SUPER_ADMIN',
        },
      },
      select: { id: true },
    });

    if (globalSuperAdmin) {
      // eslint-disable-next-line no-console
      console.log(`[RBACGuard] Super Admin global bypass triggered`);
      return true;
    }

    // TASK 6: Load role permissions
    const memberships = await this.prisma.userTenantMembership.findMany({
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

    const userPermissions = memberships.flatMap(m => 
      m.role.permissions.map(rp => rp.permission.name)
    );

    console.log(`[RBACGuard] User: ${userId} | Tenant: ${tenantId}`);
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
