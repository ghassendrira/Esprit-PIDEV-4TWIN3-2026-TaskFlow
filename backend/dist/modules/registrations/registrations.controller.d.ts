import { CompanyOwnerRegistrationDto } from './dto/company-owner-registration.dto';
import { RegistrationsService } from './registrations.service';
export declare class RegistrationsController {
    private readonly registrations;
    constructor(registrations: RegistrationsService);
    registerCompanyOwner(dto: CompanyOwnerRegistrationDto): Promise<{
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
