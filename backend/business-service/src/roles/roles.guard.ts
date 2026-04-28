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
    
    // FIX 3: Essayer les deux sources : request.user ou header
    let userRole = request.user?.role || request.headers['x-user-role'] || '';
    if (!userRole) {
      return false;
    }

    const rawRole = Array.isArray(userRole) ? userRole[0] : userRole;
    
    // Nettoyer le rôle : enlever ROLE_ prefix et espaces
    const cleanRole = String(rawRole || '').split(',')[0].trim().replace(/^ROLE_/, '').toUpperCase();

    console.log('[RolesGuard] Required roles:', requiredRoles);
    console.log('[RolesGuard] Incoming role (cleaned):', cleanRole);

    const incomingRole = this.mapIncomingRole(cleanRole);

    return requiredRoles.includes(incomingRole as Role);
  }

  private mapIncomingRole(role: string): Role {
    const r = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
    switch (r) {
      case 'ROLE_SUPER_ADMIN':
      case 'ROLE_SUPER_MANAGER':
        return Role.SUPER_ADMIN;
      case 'ROLE_OWNER':
      case 'ROLE_BUSINESS_OWNER':
      case 'ROLE_PROJECT_MANAGER':
        return Role.BUSINESS_OWNER;
      case 'ROLE_ADMIN':
      case 'ROLE_BUSINESS_ADMIN':
        return Role.BUSINESS_ADMIN;
      case 'ROLE_ACCOUNTANT':
        return Role.ACCOUNTANT;
      case 'ROLE_TEAM':
      case 'ROLE_TEAM_MEMBER':
        return Role.TEAM_MEMBER;
      case 'ROLE_CLIENT':
        return Role.CLIENT;
      default:
        return r as Role;
    }
  }
}
