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
exports.BusinessController = void 0;
const common_1 = require("@nestjs/common");
const business_service_1 = require("./business.service");
const passport_1 = require("@nestjs/passport");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const current_company_id_decorator_1 = require("../common/decorators/current-company-id.decorator");
let BusinessController = class BusinessController {
    constructor(businessService) {
        this.businessService = businessService;
    }
    async getInvoices(companyId) {
        return this.businessService.getInvoices(companyId);
    }
    async getInvoiceById(id, companyId) {
        return this.businessService.getInvoiceById(id, companyId);
    }
    async createInvoice(companyId, invoiceData) {
        return this.businessService.createInvoice(companyId, invoiceData);
    }
    async getClients(companyId) {
        return this.businessService.getClients(companyId);
    }
    async createClient(companyId, clientData) {
        return this.businessService.createClient(companyId, clientData);
    }
    async getExpenses(companyId) {
        return this.businessService.getExpenses(companyId);
    }
    async createExpense(companyId, expenseData) {
        return this.businessService.createExpense(companyId, expenseData);
    }
};
exports.BusinessController = BusinessController;
__decorate([
    (0, common_1.Get)('invoices'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Get)('invoices/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getInvoiceById", null);
__decorate([
    (0, common_1.Post)('invoices'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Get)('clients'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getClients", null);
__decorate([
    (0, common_1.Post)('clients'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "createClient", null);
__decorate([
    (0, common_1.Get)('expenses'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getExpenses", null);
__decorate([
    (0, common_1.Post)('expenses'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "createExpense", null);
exports.BusinessController = BusinessController = __decorate([
    (0, common_1.Controller)('business'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [business_service_1.BusinessService])
], BusinessController);
//# sourceMappingURL=business.controller.js.map