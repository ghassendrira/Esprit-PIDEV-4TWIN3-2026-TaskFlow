import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const roleHeader = request.headers['x-user-role'];
    if (!roleHeader) {
      return false;
    }

    const rawRole = Array.isArray(roleHeader)
      ? roleHeader[0]
      : roleHeader;
    const normalized = String(rawRole || '').split(',')[0].trim().toUpperCase();

    const incomingRole = this.mapIncomingRole(normalized);

    return requiredRoles.includes(incomingRole as Role);
  }

  private mapIncomingRole(role: string): Role {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SUPER_MANAGER':
        return Role.SUPER_ADMIN;
      case 'OWNER':
      case 'BUSINESS_OWNER':
      case 'PROJECT_MANAGER':
        return Role.BUSINESS_OWNER;
      case 'ADMIN':
      case 'BUSINESS_ADMIN':
        return Role.BUSINESS_ADMIN;
      case 'ACCOUNTANT':
        return Role.ACCOUNTANT;
      case 'TEAM':
      case 'TEAM_MEMBER':
        return Role.TEAM_MEMBER;
      case 'CLIENT':
        return Role.CLIENT;
      default:
        return role as Role;
    }
  }
}
