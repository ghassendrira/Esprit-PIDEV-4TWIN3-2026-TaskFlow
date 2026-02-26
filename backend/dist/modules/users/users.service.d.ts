import { PrismaService } from '../../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    setSecurityQAs(userId: string, qas: {
        question: string;
        answer: string;
    }[]): Promise<{
        ok: boolean;
    }>;
    getMyCompanies(userId: string): Promise<{
        companyId: string;
        role: import("@prisma/client").$Enums.CompanyRole;
        company: {
            id: string;
            name: string;
            category: string;
            logoUrl: string | null;
            matricule: string | null;
        };
    }[]>;
}
