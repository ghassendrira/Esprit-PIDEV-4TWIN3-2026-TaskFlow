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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../auth/auth.service");
const passport_1 = require("@nestjs/passport");
const User_entity_1 = require("../entities/User.entity");
let UsersController = class UsersController {
    constructor(authService) {
        this.authService = authService;
    }
    async createEmployee(req, tenantId, userData) {
        if (req.user.role !== User_entity_1.UserRole.OWNER && req.user.role !== User_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only owners or admins can create users');
        }
        const activeCompanyId = tenantId || req.user.company_id;
        if (!activeCompanyId) {
            throw new common_1.ForbiddenException('No active company context');
        }
        const createdUser = await this.authService.createUser(activeCompanyId, {
            email: userData.email,
            role: userData.role,
            firstName: userData.firstName,
            lastName: userData.lastName,
        });
        try {
            const notifBase = (process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004').replace(/\/+$/, '');
            await fetch(`${notifBase}/notification/employee-welcome`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: createdUser.email,
                    fullName: `${createdUser.firstName || ''} ${createdUser.lastName || ''}`.trim(),
                    role: userData.role,
                    tempPassword: 'temporary_password',
                    companyName: 'Votre entreprise',
                }),
            });
        }
        catch (e) {
            console.error('Failed to send welcome email:', e);
        }
        return createdUser;
    }
    async listEmployees(req, tenantId) {
        const activeCompanyId = tenantId || req.user.company_id;
        if (!activeCompanyId) {
            throw new common_1.ForbiddenException('No active company context');
        }
        return this.authService.getUsersByCompany(activeCompanyId);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Get)('list'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "listEmployees", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], UsersController);
//# sourceMappingURL=users.controller.js.map