import type { RequestUser } from '../auth/types';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateEmployeeRequestDto } from './dto/create-employee-request.dto';
import { RegistrationsService } from '../registrations/registrations.service';
export declare class CompaniesController {
    private readonly companies;
    private readonly registrations;
    constructor(companies: CompaniesService, registrations: RegistrationsService);
    list(user: RequestUser): Promise<{
        companyId: string;
        role: import("@prisma/client").$Enums.CompanyRole;
        company: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            category: string;
            logoUrl: string | null;
            matricule: string | null;
        };
    }[]>;
    get(user: RequestUser, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string;
        logoUrl: string | null;
        matricule: string | null;
    }>;
    create(user: RequestUser, dto: CreateCompanyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string;
        logoUrl: string | null;
        matricule: string | null;
    }>;
    update(user: RequestUser, companyId: string, dto: UpdateCompanyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string;
        logoUrl: string | null;
        matricule: string | null;
    }>;
    createEmployeeRequest(user: RequestUser, companyId: string, dto: CreateEmployeeRequestDto): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.RegistrationType;
        status: import("@prisma/client").$Enums.RegistrationStatus;
        companyName: string | null;
        companyCategory: string | null;
        requestedCompanyRole: import("@prisma/client").$Enums.CompanyRole | null;
        rejectionReason: string | null;
        decidedAt: Date | null;
        requestedCompanyId: string | null;
        createdByUserId: string | null;
        decidedByAdminId: string | null;
    }>;
}
