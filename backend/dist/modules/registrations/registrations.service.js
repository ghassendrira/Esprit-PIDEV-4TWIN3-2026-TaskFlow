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
exports.RegistrationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const temp_password_1 = require("../../common/password/temp-password");
let RegistrationsService = class RegistrationsService {
    prisma;
    mail;
    config;
    constructor(prisma, mail, config) {
        this.prisma = prisma;
        this.mail = mail;
        this.config = config;
    }
    async createCompanyOwnerSignup(data) {
        const req = await this.prisma.registrationRequest.create({
            data: {
                type: client_1.RegistrationType.COMPANY_OWNER_SIGNUP,
                status: client_1.RegistrationStatus.PENDING,
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
    async notifyAdminsNewRequest(registrationRequestId) {
        const req = await this.prisma.registrationRequest.findUnique({
            where: { id: registrationRequestId },
        });
        if (!req)
            throw new common_1.NotFoundException('Request not found');
        const admins = await this.prisma.user.findMany({
            where: { platformRole: client_1.PlatformRole.PLATFORM_ADMIN, isActive: true },
            select: { email: true },
        });
        const fallback = (this.config.get('PLATFORM_ADMIN_NOTIFICATION_EMAILS') ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const to = admins.length ? admins.map((a) => a.email) : fallback;
        if (!to.length) {
            return;
        }
        await this.mail.send(to, 'TaskFlow - New registration request pending', `A new registration request is pending approval.\n\nRequest ID: ${req.id}\nType: ${req.type}\nEmail: ${req.email}\nName: ${req.firstName} ${req.lastName}\nCompany: ${req.companyName ?? '-'}\nCategory: ${req.companyCategory ?? '-'}\n`);
    }
    async approveRequest(registrationRequestId, decidedByAdminId) {
        const req = await this.prisma.registrationRequest.findUnique({
            where: { id: registrationRequestId },
        });
        if (!req)
            throw new common_1.NotFoundException('Request not found');
        if (req.status !== client_1.RegistrationStatus.PENDING) {
            throw new common_1.NotFoundException('Request is not pending');
        }
        const tempPassword = (0, temp_password_1.generateTemporaryPassword)();
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        if (req.type === client_1.RegistrationType.COMPANY_OWNER_SIGNUP) {
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
                    platformRole: client_1.PlatformRole.USER,
                    mustChangePassword: true,
                    companyUsers: {
                        create: {
                            companyId: company.id,
                            role: client_1.CompanyRole.OWNER,
                        },
                    },
                },
            });
            await this.prisma.registrationRequest.update({
                where: { id: req.id },
                data: {
                    status: client_1.RegistrationStatus.APPROVED,
                    decidedByAdminId,
                    decidedAt: new Date(),
                },
            });
            await this.sendApprovedEmail(req.email, tempPassword);
            return { ok: true, companyId: company.id, userId: user.id };
        }
        if (req.type === client_1.RegistrationType.EMPLOYEE_INVITE) {
            if (!req.requestedCompanyId || !req.requestedCompanyRole) {
                throw new common_1.NotFoundException('Invalid employee invite request');
            }
            const user = await this.prisma.user.create({
                data: {
                    email: req.email,
                    firstName: req.firstName,
                    lastName: req.lastName,
                    passwordHash,
                    platformRole: client_1.PlatformRole.USER,
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
                    status: client_1.RegistrationStatus.APPROVED,
                    decidedByAdminId,
                    decidedAt: new Date(),
                },
            });
            await this.sendApprovedEmail(req.email, tempPassword, req.requestedCompanyRole);
            return { ok: true, userId: user.id, companyId: req.requestedCompanyId };
        }
        throw new common_1.NotFoundException('Unsupported request type');
    }
    async rejectRequest(registrationRequestId, decidedByAdminId, reason) {
        const req = await this.prisma.registrationRequest.findUnique({
            where: { id: registrationRequestId },
        });
        if (!req)
            throw new common_1.NotFoundException('Request not found');
        if (req.status !== client_1.RegistrationStatus.PENDING) {
            throw new common_1.NotFoundException('Request is not pending');
        }
        await this.prisma.registrationRequest.update({
            where: { id: req.id },
            data: {
                status: client_1.RegistrationStatus.REJECTED,
                rejectionReason: reason,
                decidedByAdminId,
                decidedAt: new Date(),
            },
        });
        await this.mail.send(req.email, 'TaskFlow - Registration rejected', `Your registration request was rejected.\n\nReason: ${reason}\n`);
        return { ok: true };
    }
    async sendApprovedEmail(email, tempPassword, role) {
        const loginUrl = this.config.get('APP_LOGIN_URL') ?? 'http://localhost:4200/login';
        await this.mail.send(email, 'TaskFlow - Registration approved', `Your registration was approved.\n\nLogin: ${email}\nTemporary password: ${tempPassword}\nRole: ${role ?? 'OWNER'}\n\nPlease login and change your password on first connection.\nLogin URL: ${loginUrl}\n`);
    }
};
exports.RegistrationsService = RegistrationsService;
exports.RegistrationsService = RegistrationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        config_1.ConfigService])
], RegistrationsService);
//# sourceMappingURL=registrations.service.js.map