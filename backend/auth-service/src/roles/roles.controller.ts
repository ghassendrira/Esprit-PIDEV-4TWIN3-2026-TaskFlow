import { Controller, Get, Post, Body, Headers, UnauthorizedException, Param, ForbiddenException } from '@nestjs/common';
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
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = authHeader.substring('Bearer '.length);
    try {
      return await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'change-me',
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('create')
  async createRole(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateRoleDto,
  ) {
    const payload = await this.getPayload(authHeader);
    const userId = payload.sub;
    const tenantId = payload.tenantId || payload.company_id;
    const roles = payload.roles || [];
    const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');

    return this.rolesService.createRole(dto, userId, tenantId, isAdmin);
  }

  @Get('list')
  async listRoles(@Headers('authorization') authHeader: string) {
    const payload = await this.getPayload(authHeader);
    const tenantId = payload.tenantId || payload.company_id;
    const userRoles = payload.roles || [];
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
    const roles = payload.roles || [];
    const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');

    return this.rolesService.assignPermissionsToRole(roleId, dto.permissionIds, userId, tenantId, isAdmin);
  }
}
