import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlatformRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { validatePasswordPolicy } from '../../common/password/password.policy';
import { JwtPayload } from './types';

@Injectable()
export class AuthService {
  private readonly jwtExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.jwtExpiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '1d';
  }

  private async issueAccessToken(
    userId: string,
    activeCompanyId: string | null,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      activeCompanyId,
      purpose: 'access',
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.jwtExpiresIn as any,
    });

    return {
      accessToken,
      mustChangePassword: user.mustChangePassword,
      platformRole: user.platformRole,
      activeCompanyId,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    if (user.lockUntil && user.lockUntil > now) {
      throw new ForbiddenException('Account is temporarily locked. Try later.');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const nextAttempts = user.failedLoginAttempts + 1;
      if (nextAttempts >= 3) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockUntil: new Date(now.getTime() + 60 * 60 * 1000),
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: nextAttempts },
        });
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockUntil: null },
    });

    const membership = await this.prisma.companyUser.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    return this.issueAccessToken(user.id, membership?.companyId ?? null);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const errors = validatePasswordPolicy(newPassword);
    if (errors.length) {
      throw new BadRequestException({
        message: 'Password policy failed',
        errors,
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    const membership = await this.prisma.companyUser.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return this.issueAccessToken(userId, membership?.companyId ?? null);
  }

  async switchCompany(userId: string, companyId: string) {
    const membership = await this.prisma.companyUser.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this company');
    }

    return this.issueAccessToken(userId, companyId);
  }

  async getRecoveryQuestions(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { questions: [] as string[] };
    }

    const qas = await this.prisma.userSecurityQA.findMany({
      where: { userId: user.id },
      select: { question: true },
      orderBy: { createdAt: 'asc' },
    });

    return { questions: qas.map((q) => q.question) };
  }

  async verifyRecoveryAnswers(
    email: string,
    answers: { question: string; answer: string }[],
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid recovery data');
    }

    const stored = await this.prisma.userSecurityQA.findMany({
      where: { userId: user.id },
    });
    if (!stored.length) {
      throw new BadRequestException('Security questions not configured');
    }

    for (const provided of answers) {
      const match = stored.find((s) => s.question === provided.question);
      if (!match) {
        throw new UnauthorizedException('Invalid recovery data');
      }
      const ok = await bcrypt.compare(provided.answer, match.answerHash);
      if (!ok) {
        throw new UnauthorizedException('Invalid recovery data');
      }
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      purpose: 'recovery',
    };

    const recoveryToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m' as any,
    });

    return { recoveryToken };
  }

  async resetPasswordWithRecoveryToken(
    recoveryToken: string,
    newPassword: string,
  ) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(recoveryToken);
    } catch {
      throw new UnauthorizedException('Invalid recovery token');
    }

    if (payload.purpose !== 'recovery') {
      throw new UnauthorizedException('Invalid recovery token');
    }

    const errors = validatePasswordPolicy(newPassword);
    if (errors.length) {
      throw new BadRequestException({
        message: 'Password policy failed',
        errors,
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: {
        passwordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });

    const membership = await this.prisma.companyUser.findFirst({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'asc' },
    });

    return this.issueAccessToken(payload.sub, membership?.companyId ?? null);
  }

  async ensurePlatformAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.platformRole !== PlatformRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Platform admin access required');
    }
    return true;
  }
}
