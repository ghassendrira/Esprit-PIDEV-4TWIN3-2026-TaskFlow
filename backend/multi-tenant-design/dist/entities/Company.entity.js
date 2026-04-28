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
exports.Company = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
const Invoice_entity_1 = require("./Invoice.entity");
const Client_entity_1 = require("./Client.entity");
const Expense_entity_1 = require("./Expense.entity");
let Company = class Company {
};
exports.Company = Company;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Company.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Company.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Company.prototype, "owner_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, (user) => user.ownedCompanies),
    (0, typeorm_1.JoinColumn)({ name: 'owner_id' }),
    __metadata("design:type", User_entity_1.User)
], Company.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => User_entity_1.User, (user) => user.company),
    __metadata("design:type", Array)
], Company.prototype, "users", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Invoice_entity_1.Invoice, (invoice) => invoice.company),
    __metadata("design:type", Array)
], Company.prototype, "invoices", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Client_entity_1.Client, (client) => client.company),
    __metadata("design:type", Array)
], Company.prototype, "clients", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Expense_entity_1.Expense, (expense) => expense.company),
    __metadata("design:type", Array)
], Company.prototype, "expenses", void 0);
exports.Company = Company = __decorate([
    (0, typeorm_1.Entity)('companies')
], Company);
//# sourceMappingURL=Company.entity.js.map