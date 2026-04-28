"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./auth/auth.module");
const business_module_1 = require("./business/business.module");
const User_entity_1 = require("./entities/User.entity");
const Company_entity_1 = require("./entities/Company.entity");
const Invoice_entity_1 = require("./entities/Invoice.entity");
const Client_entity_1 = require("./entities/Client.entity");
const Expense_entity_1 = require("./entities/Expense.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT) || 5432,
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || 'taskflow2026',
                database: process.env.DB_NAME || 'taskflow',
                entities: [User_entity_1.User, Company_entity_1.Company, Invoice_entity_1.Invoice, Client_entity_1.Client, Expense_entity_1.Expense],
                synchronize: true,
            }),
            auth_module_1.AuthModule,
            business_module_1.BusinessModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map