import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  BadGatewayException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SignUpDto } from './dto/signup.dto';
import { RegistrationStatus, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SecurityQuestionsDto } from './dto/security-questions.dto';
import {
  ForgotPasswordDto,
  VerifySecurityQuestionDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private otplib: any;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {
    this.notificationClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: 'localhost', port: 3005 },
    });

    try {
      // For otplib v13, we need to load the authenticator properly
      const otplibPkg = require('otplib');
      
      // If the package itself has generateSecret, it's the functional API
      if (otplibPkg.generateSecret) {
        this.otplib = {
          generateSecret: otplibPkg.generateSecret,
          keyuri: otplibPkg.generateURI,
          verify: otplibPkg.verify,
          _isFunctional: true
        };
      } else {
        // Otherwise try authenticator or default
        const auth = otplibPkg.authenticator || otplibPkg.default?.authenticator || otplibPkg;
        this.otplib = {
          generateSecret: auth.generateSecret,
          keyuri: auth.keyuri || auth.generateURI,
          verify: auth.verify,
          _isFunctional: !auth.keyuri // if keyuri is missing, it's functional generateURI
        };
      }
      
      this.logger.log('AuthService initialized with otplib mapping');
    } catch (e) {
      this.logger.error('Failed to require otplib', e);
    }
  }
  private notificationClient: ClientProxy;

  async signup(dto: SignUpDto): Promise<{
    success: boolean;
    message: string;
    data: { userId: string; tenantId: string; email: string };
  }> {
    const { firstName, lastName, email, companyName, companyCategory } = dto;
    const normalizedEmail = email.trim().toLowerCase();

    const buildAlreadyRegisteredResponse = async (userId: string) => {
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { userId },
        select: { tenantId: true },
      });

      return {
        success: true,
        message:
          'Si cette adresse email est éligible, votre demande est bien prise en compte. ' +
          'Vous recevrez un email du Super Admin pour la suite.',
        data: {
          userId,
          tenantId: membership?.tenantId ?? '',
          email: normalizedEmail,
        },
      };
    };

    if (!firstName || !lastName || !email || !companyName) {
      throw new BadRequestException('Champs requis manquants');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      // Approval-based signup: do not leak whether the email already exists.
      // Returning a success response also avoids double-submit and retry frustrations.
      return buildAlreadyRegisteredResponse(existing.id);
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    // Signup for business owners is approval-based: no password is provided yet.
    // We generate a placeholder hash so the user can be created as PENDING.
    const placeholderPassword = `temp-${Math.random().toString(36).slice(2, 10)}`;
    const passwordHash = await bcrypt.hash(placeholderPassword, saltRounds);

    const slugify = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    // 1) Créer le tenant via le Tenant Service (service séparé)
    const tenantServiceBase = (
      process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');
    let createTenantRes: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      createTenantRes = await fetch(`${tenantServiceBase}/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyName, slug: slugify(companyName) }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      throw new BadGatewayException('Tenant service unavailable');
    }
    if (!createTenantRes.ok) {
      const body = await createTenantRes.text().catch(() => '');
      throw new InternalServerErrorException(
        `Tenant creation failed: ${body || createTenantRes.statusText}`,
      );
    }
    const createdTenant = await createTenantRes.json();
    const tenantId: string = createdTenant.id;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            firstName,
            lastName,
            email: normalizedEmail,
            passwordHash,
            isActive: false,
            registrationStatus: RegistrationStatus.PENDING,
            mustChangePassword: false,
            companyCategory: companyCategory ?? null,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            avatar: true,
          },
        });
        // TASK 1: Ensure BUSINESS_OWNER role exists
        let role = await tx.role.findFirst({
          where: { name: 'BUSINESS_OWNER', tenantId: null, isStandard: true }
        });

        if (!role) {
          role = await tx.role.create({
            data: { name: 'BUSINESS_OWNER', isStandard: true, tenantId: null as any },
          });
        }

        // Create UserTenantMembership for the owner
        await tx.userTenantMembership.upsert({
          where: {
            userId_tenantId: {
              userId: user.id,
              tenantId: tenantId,
            }
          },
          update: { roleId: role.id },
          create: {
            userId: user.id,
            tenantId: tenantId,
            roleId: role.id,
          },
        });
        return { user };
      });

      // Notify admin via HTTP (notification-service)
      try {
        const adminEmail =
          process.env.ADMIN_EMAIL ?? 'nour.hasni02@gmail.com';
        await fetch('http://localhost:3004/notification/admin-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminEmail,
            applicantName: `${firstName} ${lastName}`,
            applicantEmail: normalizedEmail,
            companyName,
            userId: result.user.id,
          }),
        });
      } catch (e) {
        console.log('Failed to notify admin about registration:', e);
      }

      return {
        success: true,
        message: 'Registration submitted, awaiting approval',
        data: {
          userId: result.user.id,
          tenantId,
          email: result.user.email,
        },
      };
    } catch (error: any) {
      // If the email was created concurrently (double-submit or race), treat as idempotent.
      if (error?.code === 'P2002') {
        const user = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });
        if (user) {
          return buildAlreadyRegisteredResponse(user.id);
        }
      }

      throw new InternalServerErrorException('Erreur lors de la création du compte');
    }
  }

  async signin(
    email: string,
    password: string,
  ): Promise<{ token?: string; mustChangePassword?: boolean; requires2fa: boolean; userId?: string }> {
    const normalizedEmail = email?.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        passwordHash: true,
        isActive: true,
        registrationStatus: true,
        mustChangePassword: true,
        tempPassword: true,
        welcomeEmailSent: true,
        loginAttempts: true,
        blockedUntil: true,
        is2faEnabled: true,
        twoFaSecret: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    // Registration approval gate
    if (user.registrationStatus !== RegistrationStatus.ACTIVE || !user.isActive) {
      throw new BadRequestException('Votre compte n\'est pas encore approuvé par l\'administrateur');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Mot de passe invalide');
    }

    // Login protection (account lock)
    const now = new Date();
    if (user.blockedUntil && user.blockedUntil.getTime() > now.getTime()) {
      const mins = Math.ceil((user.blockedUntil.getTime() - now.getTime()) / 60000);
      throw new ForbiddenException(`Compte bloqué. Réessayez dans ${mins} minutes.`);
    }

    // Auto unlock if lock expired
    if (user.blockedUntil && user.blockedUntil.getTime() <= now.getTime()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { blockedUntil: null, loginAttempts: 0 },
        select: { id: true },
      });
      user.blockedUntil = null;
      user.loginAttempts = 0;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const currentAttempts = Number(user.loginAttempts ?? 0);
      const nextAttempts = currentAttempts + 1;

      if (nextAttempts >= 5) {
        const blockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: 0, blockedUntil },
          select: { id: true },
        });
        throw new ForbiddenException('Trop de tentatives. Compte bloqué pour 30 minutes.');
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: nextAttempts },
          select: { id: true },
        });
        throw new BadRequestException(`Mot de passe incorrect. Tentatives restantes : ${5 - nextAttempts}`);
      }
    }

    // Reset attempts on success
    if (Number(user.loginAttempts) > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, blockedUntil: null },
        select: { id: true },
      });
    }

    // TASK 9: Verify OTP on login (if enabled)
    if (user.is2faEnabled) {
      return { requires2fa: true, userId: user.id };
    }

    // Welcome email logic if approved but email not sent yet
    try {
      if (!user.welcomeEmailSent && !user.mustChangePassword) {
        const payload = {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userId: user.id,
        };
        const notifBase = (process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004').replace(/\/+$/, '');
        await fetch(`${notifBase}/notification/welcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(err => console.error('Notification error:', err));

        await this.prisma.user.update({
          where: { id: user.id },
          data: { welcomeEmailSent: true },
          select: { id: true },
        });
      }
    } catch (err) {
      console.error('Email trigger failed:', err);
    }

    // Get membership and role for the user
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId: user.id },
      include: { 
        role: { select: { name: true } }
      },
    });

    // Try to get tenant name from tenant-service if possible
    let tenantName = 'TaskFlow';
    try {
      const tenantBase = (process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002').replace(/\/+$/, '');
      const tRes = await fetch(`${tenantBase}/tenants/${membership?.tenantId}`);
      if (tRes.ok) {
        const tData = await tRes.json();
        tenantName = tData.name || 'TaskFlow';
      }
    } catch (err) {
      console.error('Failed to fetch tenant name:', err);
    }

    const token = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantName: tenantName,
        tenantId: membership?.tenantId ?? null,
        company_id: membership?.tenantId ?? null,
        roles: membership?.role?.name ? [membership.role.name] : [],
        mustChangePassword: Boolean(user.mustChangePassword) || user.tempPassword !== null,
      },
      {
        secret: process.env.JWT_SECRET ?? 'change-me',
        expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600),
      },
    );
    return { token, mustChangePassword: Boolean(user.mustChangePassword) || user.tempPassword !== null, requires2fa: false };
  }

  async changePassword(
    authHeader: string,
    dto: ChangePasswordDto,
  ): Promise<{ token: string }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    const token = authHeader.substring('Bearer '.length);

    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });
    const userId = (payload as any)?.sub as string | undefined;
    if (!userId) throw new UnauthorizedException();

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
        mustChangePassword: true,
        isActive: true,
        registrationStatus: true,
      },
    });

    if (!user) throw new UnauthorizedException();
    if (!user.isActive || user.registrationStatus !== RegistrationStatus.ACTIVE) {
      throw new BadRequestException('Account not approved');
    }
    if (!user.mustChangePassword) {
      throw new BadRequestException('Password change not required');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('Invalid password');
    }

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Invalid current password');
    }

    const newHash = await bcrypt.hash(dto.newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        tempPassword: null,
        // Mark welcome email as sent; component will actually call notification service.
        welcomeEmailSent: true,
      },
    });

    // Get membership and role for the user
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId },
      include: { 
        role: { select: { name: true } }
      },
    });

    // Try to get tenant name from tenant-service if possible
    let tenantName = 'TaskFlow';
    try {
      const tenantBase = (process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002').replace(/\/+$/, '');
      const tRes = await fetch(`${tenantBase}/tenants/${membership?.tenantId}`);
      if (tRes.ok) {
        const tData = await tRes.json();
        tenantName = tData.name || 'TaskFlow';
      }
    } catch (err) {
      console.error('Failed to fetch tenant name:', err);
    }

    const newToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantName: tenantName,
        tenantId: membership?.tenantId ?? null,
        company_id: membership?.tenantId ?? null,
        roles: membership?.role?.name ? [membership.role.name] : [],
        mustChangePassword: false,
      },
      {
        secret: process.env.JWT_SECRET ?? 'change-me',
        expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600),
      },
    );

    return { token: newToken };
  }

  async setSecurityQuestions(
    authHeader: string,
    dto: SecurityQuestionsDto,
  ): Promise<{ success: boolean; message: string; question: any }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    const token = authHeader.substring('Bearer '.length);

    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });
    const userId = (payload as any)?.sub as string | undefined;
    if (!userId) throw new UnauthorizedException();

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const normalizedAnswer = dto.answer.trim().toLowerCase();
    const answerHash = await bcrypt.hash(normalizedAnswer, saltRounds);

    const newQuestion = await this.prisma.securityQuestion.create({
      data: {
        userId,
        question: dto.question,
        answerHash,
      },
    });

    return {
      success: true,
      message: 'Question de sécurité enregistrée.',
      question: {
        id: newQuestion.id,
        question: newQuestion.question,
        answer: dto.answer, // On renvoie la réponse claire juste pour l'affichage immédiat dans le front
      },
    };
  }

  async getSecurityQuestions(
    authHeader: string,
  ): Promise<any[]> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    const token = authHeader.substring('Bearer '.length);

    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });
    const userId = (payload as any)?.sub as string | undefined;
    if (!userId) throw new UnauthorizedException();

    return this.prisma.securityQuestion.findMany({
      where: { userId },
      select: {
        id: true,
        question: true,
      },
    });
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ hasSecurityQuestions: boolean; message?: string; questions?: string[]; userId?: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return { hasSecurityQuestions: false, message: 'Utilisateur introuvable' };
    }
    const questions = await this.prisma.securityQuestion.findMany({
      where: { userId: user.id },
      select: { question: true },
    });
    
    // Return ALL questions instead of a random one
    return { 
      hasSecurityQuestions: questions.length > 0, 
      questions: questions.map(q => q.question),
      userId: user.id
    };
  }

  async sendResetEmail(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!user) throw new BadRequestException('Utilisateur introuvable');

    // Generate reset token
    const rawToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const resetTokenHash = await bcrypt.hash(rawToken, saltRounds);
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash,
        resetTokenExpires,
      },
    });

    // Notify notification-service to send email
    try {
      const notifBase = (process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004').replace(/\/+$/, '');
      await fetch(`${notifBase}/notification/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          firstName: user.firstName,
          lastName: user.lastName,
          resetToken: rawToken,
        }),
      });
    } catch (err) {
      this.logger.error('Failed to send reset email notification', err);
    }

    return { success: true, message: 'Email de réinitialisation envoyé' };
  }

  async contactAdminForReset(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!user) throw new BadRequestException('Utilisateur introuvable');

    // Save request in DB
    await this.prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    // Notify notification-service to alert Super Admin
    try {
      const notifBase = (process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004').replace(/\/+$/, '');
      await fetch(`${notifBase}/notification/admin-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: normalizedEmail,
          userName: `${user.firstName} ${user.lastName}`,
          userId: user.id,
        }),
      });
    } catch (err) {
      this.logger.error('Failed to notify admin about password request', err);
    }

    return { success: true, message: 'Demande envoyée au Super Admin' };
  }

  async getPendingPasswordResetRequests() {
    return this.prisma.passwordResetRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async approvePasswordReset(requestId: string) {
    const request = await this.prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request || request.status !== 'PENDING') {
      throw new BadRequestException('Request not found or already processed');
    }

    // Generate new temporary password
    const tempPassword = Math.random().toString(36).substring(2, 10);
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    // Update user
    await this.prisma.user.update({
      where: { id: request.userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        tempPassword,
      },
    });

    // Mark request as approved
    await this.prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        resolvedAt: new Date(),
      },
    });

    // Notify user via notification-service (reuse approval email or similar)
    try {
      const notifBase = (process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004').replace(/\/+$/, '');
      await fetch(`${notifBase}/notification/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.user.email,
          fullName: `${request.user.firstName} ${request.user.lastName}`,
          tempPassword,
        }),
      });
    } catch (err) {
      this.logger.error('Failed to send password reset approval email', err);
    }

    return { success: true, tempPassword };
  }

  async rejectPasswordReset(requestId: string, reason: string) {
    const request = await this.prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request || request.status !== 'PENDING') {
      throw new BadRequestException('Request not found or already processed');
    }

    await this.prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        resolvedAt: new Date(),
        adminNotes: reason,
      },
    });

    // Notify user via notification-service
    try {
      const notifBase = (process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004').replace(/\/+$/, '');
      await fetch(`${notifBase}/notification/rejection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.user.email,
          fullName: `${request.user.firstName} ${request.user.lastName}`,
          reason,
        }),
      });
    } catch (err) {
      this.logger.error('Failed to send password reset rejection email', err);
    }

    return { success: true };
  }

  async verifySecurityAnswer(
    dto: VerifySecurityQuestionDto,
  ): Promise<{ resetToken: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isActive: true,
        registrationStatus: true,
        loginAttempts: true,
        blockedUntil: true,
      },
    });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    // NOTE: we allow security-question verification even if the account is temporarily
    // locked from failed sign-in attempts. A successful verification will unlock it.

    const questions = await this.prisma.securityQuestion.findMany({
      where: { userId: user.id, question: dto.question },
      select: { answerHash: true },
    });
    if (questions.length === 0) throw new BadRequestException('Question de sécurité introuvable');

    const normalized = dto.answer.trim().toLowerCase();
    
    let ok = false;
    for (const sq of questions) {
      if (await bcrypt.compare(normalized, sq.answerHash)) {
        ok = true;
        break;
      }
    }

    if (!ok) {
      throw new BadRequestException('Réponse incorrecte');
    }

    // Unlock account after successful recovery check
    if (user.blockedUntil || Number(user.loginAttempts ?? 0) > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { blockedUntil: null, loginAttempts: 0 },
        select: { id: true },
      });
    }

    // Generate reset token
    const rawToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const resetTokenHash = await bcrypt.hash(rawToken, saltRounds);
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash,
        resetTokenExpires,
      },
    });

    return { resetToken: rawToken };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean }> {
    const { resetToken, newPassword } = dto;
    
    // Find all users with active tokens and verify which one matches the provided token
    const users = await this.prisma.user.findMany({
      where: {
        resetTokenExpires: { gt: new Date() },
      },
    });

    let foundUser: User | null = null;
    for (const u of users) {
      if (u.resetTokenHash && (await bcrypt.compare(resetToken, u.resetTokenHash))) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    // Validate password rules
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (newPassword.length < 8 || !hasUpper || !hasLower || !hasNumber) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.',
      );
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const hash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: foundUser.id },
      data: {
        passwordHash: hash,
        resetTokenHash: null,
        resetTokenExpires: null,
        loginAttempts: 0,
        blockedUntil: null,
      },
    });

    return { success: true };
  }

  async switchTenant(auth: string, tenantId: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = auth.substring('Bearer '.length);
    const payload = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });
    const userId = payload?.sub as string;
    if (!userId) throw new UnauthorizedException();

    // Verify membership
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId, tenantId },
      include: { role: { select: { name: true } } }
    });
    if (!membership) throw new UnauthorizedException('Access to tenant denied');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, mustChangePassword: true, tempPassword: true }
    });

    if (!user) throw new UnauthorizedException('User not found');

    // Try to get tenant name from tenant-service if possible
    let tenantName = 'TaskFlow';
    try {
      const tenantBase = (process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002').replace(/\/+$/, '');
      const tRes = await fetch(`${tenantBase}/tenants/${tenantId}`);
      if (tRes.ok) {
        const tData = await tRes.json();
        tenantName = tData.name || 'TaskFlow';
      }
    } catch (err) {
      console.error('Failed to fetch tenant name during switch:', err);
    }

    const newToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        tenantName: tenantName,
        tenantId: tenantId,
        company_id: tenantId,
        roles: membership.role?.name ? [membership.role.name] : [],
        mustChangePassword: Boolean(user.mustChangePassword) || user.tempPassword !== null,
      },
      {
        secret: process.env.JWT_SECRET ?? 'change-me',
        expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600),
      },
    );

    return { success: true, token: newToken, tenantId };
  }

  // TASK 9: 2FA Methods
  async generate2faSecret(userId: string) {
    try {
      this.logger.log(`[2FA] Generating/Retrieving secret for user ${userId}`);
      
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, twoFaSecret: true, is2faEnabled: true },
      });
      
      if (!user) {
        this.logger.warn(`[2FA] User ${userId} not found`);
        throw new NotFoundException('User not found');
      }

      let secret = user.twoFaSecret;
      
      if (!secret) {
        this.logger.log(`[2FA] Creating NEW secret for user ${userId}`);
        if (!this.otplib?.generateSecret) {
          this.logger.error('[2FA] otplib.generateSecret is missing');
          throw new InternalServerErrorException('2FA library configuration error');
        }
        secret = this.otplib.generateSecret();
        await this.prisma.user.update({
          where: { id: userId },
          data: { twoFaSecret: secret },
        });
      } else {
        this.logger.log(`[2FA] Reusing existing secret for user ${userId}`);
      }

      this.logger.log(`[2FA] Generating URI for ${user.email}`);
      if (!this.otplib?.keyuri) {
        this.logger.error('[2FA] otplib.keyuri is missing');
        throw new InternalServerErrorException('2FA library configuration error (keyuri)');
      }
      
      // Handle both authenticator.keyuri(label, issuer, secret) 
      // and functional generateURI({ label, issuer, secret })
      let otpauthUrl: string;
      if (this.otplib._isFunctional) {
        otpauthUrl = this.otplib.keyuri({
          issuer: 'TaskFlow',
          label: user.email,
          secret: secret
        });
      } else {
        otpauthUrl = this.otplib.keyuri(user.email, 'TaskFlow', secret);
      }
      
      this.logger.log('[2FA] Generating QR code DataURL');
      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
      
      this.logger.log(`[2FA] Successfully generated 2FA payload for user ${userId}`);
      return { secret, qrCodeDataUrl };
    } catch (err: any) {
      this.logger.error(`[2FA] Error in generate2faSecret: ${err.message}`, err.stack);
      if (err instanceof NotFoundException || err instanceof InternalServerErrorException) throw err;
      throw new InternalServerErrorException(`Failed to generate 2FA secret: ${err.message}`);
    }
  }

  async enable2fa(userId: string, otp: string) {
    try {
      this.logger.log(`[2FA] Verifying 2FA enable for user ${userId}`);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { twoFaSecret: true },
      });
      
      if (!user?.twoFaSecret) {
        this.logger.warn(`[2FA] No secret found for user ${userId} to enable 2FA`);
        throw new BadRequestException('2FA secret not generated');
      }

      if (!this.otplib?.verify) {
        this.logger.error('[2FA] otplib.verify is missing');
        throw new InternalServerErrorException('2FA library configuration error');
      }

      const result = this.otplib.verify({
        token: otp,
        secret: user.twoFaSecret,
      });

      this.logger.log(`[2FA] Verification result for user ${userId}: ${result}`);

      if (!result) {
        throw new BadRequestException('Invalid OTP');
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { is2faEnabled: true },
      });

      this.logger.log(`[2FA] 2FA enabled successfully for user ${userId}`);
      return { success: true };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`[2FA] Error in enable2fa: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Failed to enable 2FA: ${err.message}`);
    }
  }

  async verify2faAndLogin(userId: string, otp: string) {
    try {
      this.logger.log(`[2FA] Verifying 2FA login for user ${userId}`);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          twoFaSecret: true,
          is2faEnabled: true,
          mustChangePassword: true,
          tempPassword: true,
        },
      });

      if (!user || !user.is2faEnabled || !user.twoFaSecret) {
        this.logger.warn(`[2FA] 2FA login attempted for user ${userId} but not enabled/configured`);
        throw new BadRequestException('2FA not enabled for this user');
      }

      if (!this.otplib?.verify) {
        this.logger.error('[2FA] otplib.verify is missing');
        throw new InternalServerErrorException('2FA library configuration error');
      }

      const result = this.otplib.verify({
        token: otp,
        secret: user.twoFaSecret,
      });

      this.logger.log(`[2FA] Verification result for login (user ${userId}): ${result}`);

      if (!result) {
        throw new BadRequestException('Invalid OTP');
      }

      // Get membership and role for the user
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { userId: user.id },
        include: { role: { select: { name: true } } },
      });

      let tenantName = 'TaskFlow';
      try {
        const tenantBase = (process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002').replace(/\/+$/, '');
        const tRes = await fetch(`${tenantBase}/tenants/${membership?.tenantId}`);
        if (tRes.ok) {
          const tData = await tRes.json();
          tenantName = tData.name || 'TaskFlow';
        }
      } catch (err) {
        console.error('Failed to fetch tenant name during 2FA login:', err);
      }

      const token = await this.jwt.signAsync(
        {
          sub: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantName: tenantName,
          tenantId: membership?.tenantId ?? null,
          company_id: membership?.tenantId ?? null,
          roles: membership?.role?.name ? [membership.role.name] : [],
          mustChangePassword: Boolean(user.mustChangePassword) || user.tempPassword !== null,
        },
        {
          secret: process.env.JWT_SECRET ?? 'change-me',
          expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600),
        },
      );

      return { token, mustChangePassword: Boolean(user.mustChangePassword) || user.tempPassword !== null, requires2fa: false };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Error in verify2faAndLogin: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Failed to verify 2FA: ${err.message}`);
    }
  }

  private async notifyTenantService(companyName: string): Promise<void> {
    const base = process.env.TENANT_SERVICE_URL;
    if (!base) return;
    const url = `${base.replace(/\/+$/, '')}/tenants/by-name/${encodeURIComponent(companyName)}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;
    } catch {
      return;
    }
  }
}
