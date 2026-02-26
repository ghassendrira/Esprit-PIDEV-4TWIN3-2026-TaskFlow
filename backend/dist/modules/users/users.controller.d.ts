import type { RequestUser } from '../auth/types';
import { SetSecurityQuestionsDto } from './dto/set-security-questions.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    myCompanies(user: RequestUser): Promise<{
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
    setSecurityQuestions(user: RequestUser, dto: SetSecurityQuestionsDto): Promise<{
        ok: boolean;
    }>;
}
