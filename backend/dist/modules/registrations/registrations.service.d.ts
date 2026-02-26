import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare class RegistrationsService {
    private readonly prisma;
    private readonly mail;
    private readonly config;
    constructor(prisma: PrismaService, mail: MailService, config: ConfigService);
    createCompanyOwnerSignup(data: {
        companyName: string;
        companyCategory: string;
        email: string;
        firstName: string;
        lastName: string;
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
    notifyAdminsNewRequest(registrationRequestId: string): Promise<void>;
    approveRequest(registrationRequestId: string, decidedByAdminId: string): Promise<{
        ok: boolean;
        companyId: string;
        userId: string;
    }>;
    rejectRequest(registrationRequestId: string, decidedByAdminId: string, reason: string): Promise<{
        ok: boolean;
    }>;
    private sendApprovedEmail;
}
