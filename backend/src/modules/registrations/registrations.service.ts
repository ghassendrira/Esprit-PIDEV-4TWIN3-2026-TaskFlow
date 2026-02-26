import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CompanyRole,
  PlatformRole,
  RegistrationStatus,
  RegistrationType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { generateTemporaryPassword } from '../../common/password/temp-password';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async createCompanyOwnerSignup(data: {
    companyName: string;
    companyCategory: string;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const req = await this.prisma.registrationRequest.create({
      data: {
        type: RegistrationType.COMPANY_OWNER_SIGNUP,
        status: RegistrationStatus.PENDING,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        companyCategory: data.companyCategory,
      },
    });

    await this.notifyAdminsNewRequest(req.id);
    return req;
  }

  async notifyAdminsNewRequest(registrationRequestId: string) {
    const req = await this.prisma.registrationRequest.findUnique({
      where: { id: registrationRequestId },
    });
    if (!req) throw new NotFoundException('Request not found');

    const admins = await this.prisma.user.findMany({
      where: { platformRole: PlatformRole.PLATFORM_ADMIN, isActive: true },
      select: { email: true },
    });

    const fallback = (
      this.config.get<string>('PLATFORM_ADMIN_NOTIFICATION_EMAILS') ?? ''
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const to = admins.length ? admins.map((a) => a.email) : fallback;
    if (!to.length) {
      return;
    }

    await this.mail.send(
      to,
      'TaskFlow - New registration request pending',
      `A new registration request is pending approval.\n\nRequest ID: ${req.id}\nType: ${req.type}\nEmail: ${req.email}\nName: ${req.firstName} ${req.lastName}\nCompany: ${req.companyName ?? '-'}\nCategory: ${req.companyCategory ?? '-'}\n`,
    );
  }

  async approveRequest(
    registrationRequestId: string,
    decidedByAdminId: string,
  ) {
    const req = await this.prisma.registrationRequest.findUnique({
      where: { id: registrationRequestId },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== RegistrationStatus.PENDING) {
      throw new NotFoundException('Request is not pending');
    }

    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    if (req.type === RegistrationType.COMPANY_OWNER_SIGNUP) {
      const company = await this.prisma.company.create({
        data: {
          name: req.companyName ?? 'New Company',
          category: req.companyCategory ?? 'Uncategorized',
        },
      });

      const user = await this.prisma.user.create({
        data: {
          email: req.email,
          firstName: req.firstName,
          lastName: req.lastName,
          passwordHash,
          platformRole: PlatformRole.USER,
          mustChangePassword: true,
          companyUsers: {
            create: {
              companyId: company.id,
              role: CompanyRole.OWNER,
            },
          },
        },
      });

      await this.prisma.registrationRequest.update({
        where: { id: req.id },
        data: {
          status: RegistrationStatus.APPROVED,
          decidedByAdminId,
          decidedAt: new Date(),
        },
      });

      await this.sendApprovedEmail(req.email, tempPassword);

      return { ok: true, companyId: company.id, userId: user.id };
    }

    if (req.type === RegistrationType.EMPLOYEE_INVITE) {
      if (!req.requestedCompanyId || !req.requestedCompanyRole) {
        throw new NotFoundException('Invalid employee invite request');
      }

      const user = await this.prisma.user.create({
        data: {
          email: req.email,
          firstName: req.firstName,
          lastName: req.lastName,
          passwordHash,
          platformRole: PlatformRole.USER,
          mustChangePassword: true,
          companyUsers: {
            create: {
              companyId: req.requestedCompanyId,
              role: req.requestedCompanyRole,
            },
          },
        },
      });

      await this.prisma.registrationRequest.update({
        where: { id: req.id },
        data: {
          status: RegistrationStatus.APPROVED,
          decidedByAdminId,
          decidedAt: new Date(),
        },
      });

      await this.sendApprovedEmail(
        req.email,
        tempPassword,
        req.requestedCompanyRole,
      );
      return { ok: true, userId: user.id, companyId: req.requestedCompanyId };
    }

    throw new NotFoundException('Unsupported request type');
  }

  async rejectRequest(
    registrationRequestId: string,
    decidedByAdminId: string,
    reason: string,
  ) {
    const req = await this.prisma.registrationRequest.findUnique({
      where: { id: registrationRequestId },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== RegistrationStatus.PENDING) {
      throw new NotFoundException('Request is not pending');
    }

    await this.prisma.registrationRequest.update({
      where: { id: req.id },
      data: {
        status: RegistrationStatus.REJECTED,
        rejectionReason: reason,
        decidedByAdminId,
        decidedAt: new Date(),
      },
    });

    await this.mail.send(
      req.email,
      'TaskFlow - Registration rejected',
      `Your registration request was rejected.\n\nReason: ${reason}\n`,
    );

    return { ok: true };
  }

  private async sendApprovedEmail(
    email: string,
    tempPassword: string,
    role?: CompanyRole,
  ) {
    const loginUrl =
      this.config.get<string>('APP_LOGIN_URL') ?? 'http://localhost:4200/login';
    await this.mail.send(
      email,
      'TaskFlow - Registration approved',
      `Your registration was approved.\n\nLogin: ${email}\nTemporary password: ${tempPassword}\nRole: ${role ?? 'OWNER'}\n\nPlease login and change your password on first connection.\nLogin URL: ${loginUrl}\n`,
    );
  }
}
