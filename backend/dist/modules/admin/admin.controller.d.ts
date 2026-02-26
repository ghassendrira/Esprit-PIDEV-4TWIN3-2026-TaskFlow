import type { RequestUser } from '../auth/types';
import { AdminService } from './admin.service';
import { RejectRequestDto } from './dto/reject-request.dto';
import { RegistrationStatus } from '@prisma/client';
export declare class AdminController {
    private readonly admin;
    constructor(admin: AdminService);
    list(status?: RegistrationStatus): Promise<{
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
    approve(user: RequestUser, id: string): Promise<{
        ok: boolean;
        companyId: string;
        userId: string;
    }>;
    reject(user: RequestUser, id: string, dto: RejectRequestDto): Promise<{
        ok: boolean;
    }>;
}
