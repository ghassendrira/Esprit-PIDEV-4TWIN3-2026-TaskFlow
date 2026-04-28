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
exports.BusinessService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const Invoice_entity_1 = require("../entities/Invoice.entity");
const Client_entity_1 = require("../entities/Client.entity");
const Expense_entity_1 = require("../entities/Expense.entity");
let BusinessService = class BusinessService {
    constructor(invoiceRepository, clientRepository, expenseRepository) {
        this.invoiceRepository = invoiceRepository;
        this.clientRepository = clientRepository;
        this.expenseRepository = expenseRepository;
    }
    async getExpenses(companyId) {
        return this.expenseRepository.find({
            where: { company_id: companyId },
        });
    }
    async createExpense(companyId, expenseData) {
        const expense = this.expenseRepository.create({
            ...expenseData,
            company_id: companyId,
        });
        return this.expenseRepository.save(expense);
    }
    async getInvoices(companyId) {
        return this.invoiceRepository.find({
            where: { company_id: companyId },
        });
    }
    async getInvoiceById(id, companyId) {
        const invoice = await this.invoiceRepository.findOne({
            where: { id, company_id: companyId },
        });
        if (!invoice) {
            throw new common_1.ForbiddenException('Invoice not found or access denied');
        }
        return invoice;
    }
    async createInvoice(companyId, invoiceData) {
        const invoice = this.invoiceRepository.create({
            ...invoiceData,
            company_id: companyId,
        });
        return this.invoiceRepository.save(invoice);
    }
    async getClients(companyId) {
        return this.clientRepository.find({
            where: { company_id: companyId },
        });
    }
    async createClient(companyId, clientData) {
        const client = this.clientRepository.create({
            ...clientData,
            company_id: companyId,
        });
        return this.clientRepository.save(client);
    }
};
exports.BusinessService = BusinessService;
exports.BusinessService = BusinessService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(Invoice_entity_1.Invoice)),
    __param(1, (0, typeorm_1.InjectRepository)(Client_entity_1.Client)),
    __param(2, (0, typeorm_1.InjectRepository)(Expense_entity_1.Expense)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BusinessService);
//# sourceMappingURL=business.service.js.map