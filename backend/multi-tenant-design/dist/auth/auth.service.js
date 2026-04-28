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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const User_entity_1 = require("../entities/User.entity");
const Company_entity_1 = require("../entities/Company.entity");
const bcrypt_1 = require("bcrypt");
let AuthService = class AuthService {
    constructor(userRepository, companyRepository, jwtService) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.jwtService = jwtService;
    }
    async createCompany(ownerId, companyName) {
        const owner = await this.userRepository.findOne({ where: { id: ownerId } });
        if (!owner || !owner.is_owner) {
            throw new common_1.ForbiddenException('Only a Business Owner can create a company');
        }
        const company = this.companyRepository.create({
            name: companyName,
            owner_id: ownerId,
        });
        const savedCompany = await this.companyRepository.save(company);
        return this.switchCompany(ownerId, savedCompany.id);
    }
    async switchCompany(ownerId, companyId) {
        const owner = await this.userRepository.findOne({
            where: { id: ownerId },
            relations: ['ownedCompanies']
        });
        if (!owner || !owner.is_owner) {
            throw new common_1.ForbiddenException('Not authorized');
        }
        const company = await this.companyRepository.findOne({ where: { id: companyId } });
        if (!company || company.owner_id !== ownerId) {
            throw new common_1.ForbiddenException('This company does not belong to you');
        }
        owner.company_id = companyId;
        await this.userRepository.save(owner);
        const payload = {
            sub: owner.id,
            email: owner.email,
            role: owner.role,
            company_id: companyId
        };
        return {
            access_token: this.jwtService.sign(payload),
            company: {
                id: company.id,
                name: company.name
            }
        };
    }
    async createUser(companyId, userData) {
        const existing = await this.userRepository.findOne({ where: { email: userData.email } });
        if (existing) {
            throw new common_1.ConflictException('Email already exists');
        }
        if (userData.role === User_entity_1.UserRole.OWNER) {
            throw new common_1.ForbiddenException('Cannot create another owner for a company');
        }
        const newUser = this.userRepository.create({
            ...userData,
            company_id: companyId,
            is_owner: false,
            passwordHash: await bcrypt_1.default.hash('temporary_password', 10),
        });
        return this.userRepository.save(newUser);
    }
    async getUsersByCompany(companyId) {
        return this.userRepository.find({
            where: { company_id: companyId },
            select: ['id', 'email', 'role', 'firstName', 'lastName', 'is_owner', 'company_id'],
            order: { createdAt: 'DESC' }
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(User_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(Company_entity_1.Company)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map