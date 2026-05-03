import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  Headers,
  Post,
  Param,
  UnauthorizedException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import bcrypt from 'bcrypt';
import { RBACGuard } from '../roles/rbac.guard';
import { RequirePermissions } from '../roles/decorators/permissions.decorator';

type JwtPayload = { sub: string };

@Controller('users')
@UseGuards(RBACGuard)
export class UsersController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private sanitizeTenantId(value?: string | null): string | null {
    if (!value) return null;
    const v = String(value).trim();
    if (!v || v === 'null' || v === 'undefined') return null;
    return v;
  }

  private async resolveTenantIdForUser(
    userId: string,
    payload: any,
    tenantIdFromHeader?: string,
  ): Promise<string> {
    const candidates: string[] = [];
    const fromHeader = this.sanitizeTenantId(tenantIdFromHeader);
    const fromPayloadTenant = this.sanitizeTenantId((payload as any)?.tenantId);
    const fromPayloadCompany = this.sanitizeTenantId((payload as any)?.company_id);

    if (fromHeader) candidates.push(fromHeader);
    if (fromPayloadTenant) candidates.push(fromPayloadTenant);
    if (fromPayloadCompany) candidates.push(fromPayloadCompany);

    for (const tenantId of [...new Set(candidates)]) {
      const hasMembership = await this.prisma.userTenantMembership.findFirst({
        where: { userId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (hasMembership) return tenantId;
    }

    const latestMembership = await this.prisma.userTenantMembership.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { tenantId: true },
    });

    if (!latestMembership?.tenantId) {
      throw new UnauthorizedException('No membership found');
    }

    return latestMembership.tenantId;
  }

  private async assertBusinessOwner(authHeader?: string, tenantIdFromHeader?: string): Promise<{
    userId: string;
    tenantId: string;
  }> {
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

    let payload: any;
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

    const userId = payload?.sub;
    if (!userId) throw new UnauthorizedException();

    const resolvedTenantId = await this.resolveTenantIdForUser(userId, payload, tenantIdFromHeader);

    // Find the specific membership for the resolved tenant.
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: {
        userId,
        tenantId: resolvedTenantId,
        deletedAt: null,
      },
      include: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('No valid membership found for this company context');
    }

    return { userId, tenantId: membership.tenantId };
  }

  @Post('create')
  @RequirePermissions('Create_User')
  async createEmployee(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantIdFromHeader: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    // Use the tenantId from the header to ensure we create the employee in the correct company
    const { tenantId } = await this.assertBusinessOwner(authorization, tenantIdFromHeader);

    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Email already used');

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const tempPassword = Math.random().toString(36).slice(2, 12);
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    let role = await this.prisma.role.findFirst({
      where: { name: dto.role, tenantId: null as any },
    });

    if (!role) {
      role = await this.prisma.role.create({
        data: { name: dto.role, isStandard: true, tenantId: null as any },
      });
    }

    const created = await this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: normalizedEmail,
        passwordHash,
        tempPassword: passwordHash, // store hash
        isActive: true,
        registrationStatus: 'ACTIVE' as any,
        mustChangePassword: true, // This triggers the redirect to change-password page
        loginAttempts: 0,
        blockedUntil: null,
        welcomeEmailSent: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    await this.prisma.userTenantMembership.create({
      data: { userId: created.id, tenantId, roleId: role.id },
    });

    const fullName = `${created.firstName} ${created.lastName}`;
    let companyName = 'Votre entreprise';
    try {
      const tenantServiceBase = (
        process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
      ).replace(/\/$/, "").replace(/\/$/, "").split("/").filter(Boolean).join("/");
      const r = await fetch(`${tenantServiceBase}/tenants/${tenantId}`);
      if (r.ok) {
        const tenant = await r.json();
        companyName = tenant?.name ?? companyName;
      }
    } catch {
      // fallback
    }

    try {
      const notifBase = (process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004').replace(/\/$/, "").replace(/\/$/, "").split("/").filter(Boolean).join("/");
      await fetch(`${notifBase}/notification/employee-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: created.email,
          fullName,
          role: dto.role,
          tempPassword: tempPassword,
          companyName,
        }),
      });
    } catch (e) {
      console.error('Failed to send welcome email:', e);
    }

    return { success: true, message: 'Employee account created. Login details sent by email.', user: created };
  }

  @Get('list')
  @RequirePermissions('Read_User')
  async listEmployees(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantIdFromHeader?: string,
  ) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = authorization.substring('Bearer '.length);
    
    let payload: JwtPayload;
    try {
      payload = (await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'change-me',
      })) as JwtPayload;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = payload?.sub;
    if (!userId) throw new UnauthorizedException();

    const tenantId = await this.resolveTenantIdForUser(userId, payload, tenantIdFromHeader);

    const memberships = await (async () => {
      return this.prisma.userTenantMembership.findMany({
        where: {
          tenantId,
          user: { deletedAt: null }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
              createdAt: true,
            },
          },
          role: { select: { name: true } },
        },
        orderBy: {
          joinedAt: 'desc'
        }
      });
    })();

    return memberships.map((m) => {
      // Standardize role names for the frontend filter to work
      let displayRole = m.role.name.toUpperCase();
      
      // Ensure specific mappings for frontend expectations
      if (displayRole === 'TEAM-MEMBER') displayRole = 'TEAM_MEMBER';
      if (displayRole === 'ADMIN' || displayRole === 'BUSINESS_ADMIN' || displayRole === 'NIGHT_SHIFT_LEAD') displayRole = 'ADMIN';
      if (displayRole === 'ACCOUNTANT') displayRole = 'ACCOUNTANT';
      if (displayRole === 'BUSINESS_OWNER' || displayRole === 'OWNER' || displayRole === 'PROJECT_MANAGER') displayRole = 'BUSINESS_OWNER';
      if (displayRole === 'SUPER_ADMIN' || displayRole === 'SUPER_MANAGER') displayRole = 'SUPER_ADMIN';

      return {
        id: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        role: displayRole,
        isActive: m.user.isActive,
        createdAt: m.joinedAt, // Map joinedAt to createdAt for the frontend interface
      };
    });
  }

  @Get(':id')
  @RequirePermissions('Show_User')
  async getEmployee(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantIdFromHeader?: string,
  ) {
    const { tenantId } = await this.assertBusinessOwner(authorization, tenantIdFromHeader);

    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { 
        userId: id,
        tenantId,
        user: { deletedAt: null }
      },
      include: {
        user: true,
        role: true,
      },
    });

    if (!membership) throw new BadRequestException('User not found in this company');

    return {
      id: membership.user.id,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      email: membership.user.email,
      role: membership.role.name,
      isActive: membership.user.isActive,
      createdAt: membership.joinedAt,
    };
  }

  @Post(':id/delete') // Using POST for delete to simplify proxying if needed, or could use Delete
  @RequirePermissions('Delete_User')
  async deleteEmployee(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantIdFromHeader?: string,
  ) {
    const { tenantId } = await this.assertBusinessOwner(authorization, tenantIdFromHeader);

    // Verify user exists in this company
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId: id, tenantId },
    });

    if (!membership) throw new BadRequestException('User not found in this company');

    // Soft delete the user
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { success: true, message: 'Employee deleted successfully' };
  }
}

