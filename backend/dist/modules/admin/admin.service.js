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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const registrations_service_1 = require("../registrations/registrations.service");
let AdminService = class AdminService {
    prisma;
    registrations;
    constructor(prisma, registrations) {
        this.prisma = prisma;
        this.registrations = registrations;
    }
    async listRequests(status) {
        return this.prisma.registrationRequest.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
        });
    }
    async approveRequest(requestId, decidedByAdminId) {
        return this.registrations.approveRequest(requestId, decidedByAdminId);
    }
    async rejectRequest(requestId, decidedByAdminId, reason) {
        return this.registrations.rejectRequest(requestId, decidedByAdminId, reason);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        registrations_service_1.RegistrationsService])
], AdminService);
//# sourceMappingURL=admin.service.js.map