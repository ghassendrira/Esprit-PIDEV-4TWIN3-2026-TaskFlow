import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
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
    console.log('[admin.approve] tempPassword (plain) =', tempPassword);

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
    try {
      await fetch('http://localhost:3004/notification/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: updated.email,
          fullName: `${updated.firstName} ${updated.lastName}`,
          tempPassword,
        }),
      });
    } catch (e) {
      console.log('Failed to send approval email:', e);
    }

    console.log('[admin.approve] password sent in email =', tempPassword);

    return { success: true };
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

    try {
      await fetch('http://localhost:3004/notification/rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: updated.email,
          fullName: `${updated.firstName} ${updated.lastName}`,
          reason: reason || 'Your registration was not approved.',
        }),
      });
    } catch (e) {
      console.log('Failed to send rejection email:', e);
    }

    return { success: true };
  }
}

