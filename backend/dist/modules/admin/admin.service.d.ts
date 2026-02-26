import { RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationsService } from '../registrations/registrations.service';
export declare class AdminService {
    private readonly prisma;
    private readonly registrations;
    constructor(prisma: PrismaService, registrations: RegistrationsService);
    listRequests(status: RegistrationStatus): Promise<{
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
    }[]>;
    approveRequest(requestId: string, decidedByAdminId: string): Promise<{
        ok: boolean;
        companyId: string;
        userId: string;
    }>;
    rejectRequest(requestId: string, decidedByAdminId: string, reason: string): Promise<{
        ok: boolean;
    }>;
}
