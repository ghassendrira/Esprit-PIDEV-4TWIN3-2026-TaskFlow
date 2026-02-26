import { CompanyRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class CompaniesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listForUser(userId: string): Promise<({
        company: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            category: string;
            logoUrl: string | null;
            matricule: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        companyId: string;
        userId: string;
        role: import("@prisma/client").$Enums.CompanyRole;
    })[]>;
    getCompanyForMember(companyId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string;
        logoUrl: string | null;
        matricule: string | null;
    }>;
    createCompanyAsOwner(userId: string, data: {
        name: string;
        category: string;
        logoUrl?: string;
        matricule?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string;
        logoUrl: string | null;
        matricule: string | null;
    }>;
    updateCompany(companyId: string, userId: string, patch: {
        name?: string;
        category?: string;
        logoUrl?: string;
        matricule?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string;
        logoUrl: string | null;
        matricule: string | null;
    }>;
    createEmployeeInviteRequest(companyId: string, creatorUserId: string, dto: {
        email: string;
        firstName: string;
        lastName: string;
        role: CompanyRole;
    }): Promise<{
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
    ensureCompanyExists(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string;
        logoUrl: string | null;
        matricule: string | null;
    }>;
}
