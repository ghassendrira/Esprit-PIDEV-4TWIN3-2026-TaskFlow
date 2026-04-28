import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  InternalServerErrorException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

type JwtPayload = { sub: string; email: string };

@Controller('admin')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async resolveCompanyName(tenantId?: string): Promise<string> {
    if (!tenantId) return '';

    const tenantServiceBase = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');

    try {
      const response = await fetch(`${tenantServiceBase}/tenants/${tenantId}`);
      if (!response.ok) return '';
      const tenant = await response.json();
      return (tenant?.name as string) ?? '';
    } catch {
      return '';
    }
  }

  private async assertSuperAdmin(authHeader?: string): Promise<{
    userId: string;
  }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    const token = authHeader.substring('Bearer '.length);
    const payload = (await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    })) as JwtPayload;
    const userId = payload?.sub;
    if (!userId) throw new UnauthorizedException();

    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId },
      include: { role: true },
    });
    if (!membership || membership.role.name !== 'SUPER_ADMIN') {
      throw new UnauthorizedException();
    }
    return { userId };
  }

  @Get('registrations')
  async registrations(
    @Headers('authorization') authorization: string,
  ): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      companyName: string;
      createdAt: Date;
    }>
  > {
    await this.assertSuperAdmin(authorization);

    const pendingUsers = await this.prisma.user.findMany({
      where: { registrationStatus: 'PENDING', deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        memberships: {
          select: {
            tenantId: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tenantServiceBase = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');

    const results: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      companyName: string;
      createdAt: Date;
    }> = [];

    for (const u of pendingUsers) {
      const tenantId = u.memberships[0]?.tenantId;
      let companyName = '';
      if (tenantId) {
        try {
          const r = await fetch(`${tenantServiceBase}/tenants/${tenantId}`);
          if (r.ok) {
            const t = await r.json();
            companyName = (t?.name as string) ?? '';
          }
        } catch {
          // ignore
        }
      }
      results.push({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        companyName,
        createdAt: u.createdAt,
      });
    }

    return results;
  }

  @Get('blocked-accounts')
  async blockedAccounts(
    @Headers('authorization') authorization: string,
  ): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      companyName: string;
      roleName: string;
      blockedUntil: Date;
      loginAttempts: number;
      createdAt: Date;
    }>
  > {
    await this.assertSuperAdmin(authorization);

    const now = new Date();
    const blockedUsers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        registrationStatus: 'ACTIVE',
        blockedUntil: {
          gt: now,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        blockedUntil: true,
        loginAttempts: true,
        createdAt: true,
        memberships: {
          select: {
            tenantId: true,
            role: {
              select: {
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { blockedUntil: 'desc' },
    });

    const results: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      companyName: string;
      roleName: string;
      blockedUntil: Date;
      loginAttempts: number;
      createdAt: Date;
    }> = [];

    for (const user of blockedUsers) {
      const membership = user.memberships[0];
      const companyName = await this.resolveCompanyName(membership?.tenantId);

      results.push({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        companyName,
        roleName: membership?.role?.name ?? 'USER',
        blockedUntil: user.blockedUntil as Date,
        loginAttempts: user.loginAttempts ?? 0,
        createdAt: user.createdAt,
      });
    }

    return results;
  }

  @Post('unblock/:userId')
  async unblockAccount(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
  ) {
    await this.assertSuperAdmin(authorization);
    if (!userId) throw new BadRequestException('userId is required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, blockedUntil: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        blockedUntil: null,
        loginAttempts: 0,
      },
      select: { id: true },
    });

    return {
      success: true,
      message: `Compte débloqué pour ${user.email}`,
    };
  }

  @Post('approve/:userId')
  async approve(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
  ) {
    await this.assertSuperAdmin(authorization);
    if (!userId) throw new BadRequestException('userId is required');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const tempPassword = Math.random().toString(36).slice(-8);

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const bcrypt = (await import('bcrypt')).default;
    const tempPasswordHash = await bcrypt.hash(tempPassword, saltRounds);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        registrationStatus: 'ACTIVE' as any,
        isActive: true,
        mustChangePassword: true,
        tempPassword: tempPasswordHash,
        // signin() compare le champ passwordHash, donc on doit l'aligner sur le temp password
        passwordHash: tempPasswordHash,
        rejectionReason: null,
      },
    });

    // Notify applicant via notification-service
    const notificationBase = (
      process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004'
    ).replace(/\/+$/, '');

    try {
      const r = await fetch(`${notificationBase}/notification/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: updated.email,
          fullName: `${updated.firstName} ${updated.lastName}`,
          tempPassword,
        }),
      });

      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(text || r.statusText);
      }
    } catch (e) {
      console.log('Failed to send approval email:', e);
      throw new InternalServerErrorException(
        'Compte approuvé, mais envoi de l’email échoué (notification-service)'
      );
    }

    return { success: true, emailSent: true };
  }

  @Post('reject/:userId')
  async reject(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    await this.assertSuperAdmin(authorization);
    if (!userId) throw new BadRequestException('userId is required');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const reason = (body?.reason ?? '').trim();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        registrationStatus: 'REJECTED' as any,
        isActive: false,
        mustChangePassword: false,
        tempPassword: null,
        rejectionReason: reason || null,
      },
    });

    const notificationBase = (
      process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004'
    ).replace(/\/+$/, '');

    try {
      const r = await fetch(`${notificationBase}/notification/rejection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: updated.email,
          fullName: `${updated.firstName} ${updated.lastName}`,
          reason: reason || 'Your registration was not approved.',
        }),
      });

      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(text || r.statusText);
      }
    } catch (e) {
      console.log('Failed to send rejection email:', e);
      throw new InternalServerErrorException(
        'Compte refusé, mais envoi de l’email échoué (notification-service)'
      );
    }

    return { success: true, emailSent: true };
  }
}

