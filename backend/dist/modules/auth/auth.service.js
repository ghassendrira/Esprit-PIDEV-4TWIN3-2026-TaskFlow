"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
const password_policy_1 = require("../../common/password/password.policy");
let AuthService = class AuthService {
    prisma;
    jwtService;
    jwtExpiresIn;
    constructor(prisma, jwtService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.jwtExpiresIn = config.get('JWT_EXPIRES_IN') ?? '1d';
    }
    async issueAccessToken(userId, activeCompanyId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        const payload = {
            sub: user.id,
            email: user.email,
            platformRole: user.platformRole,
            activeCompanyId,
            purpose: 'access',
        };
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: this.jwtExpiresIn,
        });
        return {
            accessToken,
            mustChangePassword: user.mustChangePassword,
            platformRole: user.platformRole,
            activeCompanyId,
        };
    }
    async login(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const now = new Date();
        if (user.lockUntil && user.lockUntil > now) {
            throw new common_1.ForbiddenException('Account is temporarily locked. Try later.');
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
            }
            else {
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: nextAttempts },
                });
            }
            throw new common_1.UnauthorizedException('Invalid credentials');
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
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        const ok = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!ok) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const errors = (0, password_policy_1.validatePasswordPolicy)(newPassword);
        if (errors.length) {
            throw new common_1.BadRequestException({
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
    async switchCompany(userId, companyId) {
        const membership = await this.prisma.companyUser.findUnique({
            where: { companyId_userId: { companyId, userId } },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('Not a member of this company');
        }
        return this.issueAccessToken(userId, companyId);
    }
    async getRecoveryQuestions(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { questions: [] };
        }
        const qas = await this.prisma.userSecurityQA.findMany({
            where: { userId: user.id },
            select: { question: true },
            orderBy: { createdAt: 'asc' },
        });
        return { questions: qas.map((q) => q.question) };
    }
    async verifyRecoveryAnswers(email, answers) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid recovery data');
        }
        const stored = await this.prisma.userSecurityQA.findMany({
            where: { userId: user.id },
        });
        if (!stored.length) {
            throw new common_1.BadRequestException('Security questions not configured');
        }
        for (const provided of answers) {
            const match = stored.find((s) => s.question === provided.question);
            if (!match) {
                throw new common_1.UnauthorizedException('Invalid recovery data');
            }
            const ok = await bcrypt.compare(provided.answer, match.answerHash);
            if (!ok) {
                throw new common_1.UnauthorizedException('Invalid recovery data');
            }
        }
        const payload = {
            sub: user.id,
            email: user.email,
            platformRole: user.platformRole,
            purpose: 'recovery',
        };
        const recoveryToken = await this.jwtService.signAsync(payload, {
            expiresIn: '15m',
        });
        return { recoveryToken };
    }
    async resetPasswordWithRecoveryToken(recoveryToken, newPassword) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(recoveryToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid recovery token');
        }
        if (payload.purpose !== 'recovery') {
            throw new common_1.UnauthorizedException('Invalid recovery token');
        }
        const errors = (0, password_policy_1.validatePasswordPolicy)(newPassword);
        if (errors.length) {
            throw new common_1.BadRequestException({
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
    async ensurePlatformAdmin(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.platformRole !== client_1.PlatformRole.PLATFORM_ADMIN) {
            throw new common_1.ForbiddenException('Platform admin access required');
        }
        return true;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map