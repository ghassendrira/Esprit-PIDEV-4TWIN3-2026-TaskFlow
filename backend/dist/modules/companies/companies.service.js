"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let CompaniesService = class CompaniesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForUser(userId) {
        return this.prisma.companyUser.findMany({
            where: { userId },
            include: { company: true },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getCompanyForMember(companyId, userId) {
        const membership = await this.prisma.companyUser.findUnique({
            where: { companyId_userId: { companyId, userId } },
            include: { company: true },
        });
        if (!membership)
            throw new common_1.ForbiddenException('Not a member of this company');
        return membership.company;
    }
    async createCompanyAsOwner(userId, data) {
        const company = await this.prisma.company.create({
            data: {
                name: data.name,
                category: data.category,
                logoUrl: data.logoUrl,
                matricule: data.matricule,
                users: {
                    create: {
                        userId,
                        role: client_1.CompanyRole.OWNER,
                    },
                },
            },
        });
        return company;
    }
    async updateCompany(companyId, userId, patch) {
        const membership = await this.prisma.companyUser.findUnique({
            where: { companyId_userId: { companyId, userId } },
        });
        if (!membership)
            throw new common_1.ForbiddenException('Not a member of this company');
        if (membership.role !== client_1.CompanyRole.OWNER &&
            membership.role !== client_1.CompanyRole.ADMIN) {
            throw new common_1.ForbiddenException('Insufficient company role');
        }
        const company = await this.prisma.company.update({
            where: { id: companyId },
            data: patch,
        });
        return company;
    }
    async createEmployeeInviteRequest(companyId, creatorUserId, dto) {
        const creatorMembership = await this.prisma.companyUser.findUnique({
            where: { companyId_userId: { companyId, userId: creatorUserId } },
        });
        if (!creatorMembership)
            throw new common_1.ForbiddenException('Not a member of this company');
        if (creatorMembership.role !== client_1.CompanyRole.OWNER &&
            creatorMembership.role !== client_1.CompanyRole.ADMIN) {
            throw new common_1.ForbiddenException('Insufficient company role');
        }
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ForbiddenException('User with this email already exists');
        }
        const req = await this.prisma.registrationRequest.create({
            data: {
                type: client_1.RegistrationType.EMPLOYEE_INVITE,
                status: client_1.RegistrationStatus.PENDING,
                email: dto.email,
                firstName: dto.firstName,
                lastName: dto.lastName,
                requestedCompanyId: companyId,
                requestedCompanyRole: dto.role,
                createdByUserId: creatorUserId,
            },
        });
        return req;
    }
    async ensureCompanyExists(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        return company;
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map