import { Controller, Get, Post, Delete, Body, Headers, UnauthorizedException, Param } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionsDto } from './dto/assign-permission.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('roles')
export class RolesController {
  constructor(
    private rolesService: RolesService,
    private jwt: JwtService,
  ) {}

  private async getPayload(authHeader?: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Malformed Authorization header (no Bearer prefix)');
    }

    const token = authHeader.substring('Bearer '.length).trim();

    if (!token || token === 'undefined' || token === 'null') {
      throw new UnauthorizedException('Invalid or empty token');
    }

    try {
      return await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'change-me',
      });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private normalizeRoles(rawRoles: unknown): string[] {
    const roles = Array.isArray(rawRoles) ? rawRoles : [];
    return roles
      .map((role) => String(role ?? '').trim().replace(/^ROLE_/, '').toUpperCase())
      .filter(Boolean);
  }

  @Post('create')
  async createRole(
    @Headers('authorization') authHeader: string,
    @Headers('x-tenant-id') tenantHeader: string,
    @Body() dto: CreateRoleDto,
  ) {
    const payload = await this.getPayload(authHeader);
    const userId = payload.sub;
    const tenantId = tenantHeader || payload.tenantId || payload.company_id;
    const roles = this.normalizeRoles(payload.roles);
    const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');

    return this.rolesService.createRole(dto, userId, tenantId, isAdmin);
  }

  @Get('list')
  async listRoles(
    @Headers('authorization') authHeader: string,
    @Headers('x-tenant-id') tenantHeader: string
  ) {
    const payload = await this.getPayload(authHeader);
    const tenantId = tenantHeader || payload.tenantId || payload.company_id;
    const userRoles = this.normalizeRoles(payload.roles);
    return this.rolesService.getRoles(tenantId, userRoles);
  }

  @Get('permissions')
  async listPermissions() {
    return this.rolesService.getPermissions();
  }

  @Post(':id/permissions')
  async assignPermissions(
    @Param('id') roleId: string,
    @Headers('authorization') authHeader: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    const payload = await this.getPayload(authHeader);
    const userId = payload.sub;
    const tenantId = payload.tenantId || payload.company_id;
    const roles = this.normalizeRoles(payload.roles);
    const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');

    return this.rolesService.assignPermissionsToRole(roleId, dto.permissionIds, userId, tenantId, isAdmin);
  }

  @Delete(':id')
  async deleteRole(
    @Param('id') roleId: string,
    @Headers('authorization') authHeader: string,
    @Headers('x-tenant-id') tenantHeader: string,
  ) {
    const payload = await this.getPayload(authHeader);
    const userId = payload.sub;
    const tenantId = tenantHeader || payload.tenantId || payload.company_id;
    const roles = this.normalizeRoles(payload.roles);
    const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');

    return this.rolesService.deleteRole(roleId, userId, tenantId, isAdmin);
  }
}
