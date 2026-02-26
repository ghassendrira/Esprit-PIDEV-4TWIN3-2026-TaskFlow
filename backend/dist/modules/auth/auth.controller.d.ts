import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { RequestUser } from './types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';
import { RecoverGetQuestionsDto, RecoverResetDto, RecoverVerifyDto } from './dto/recover.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        mustChangePassword: boolean;
        platformRole: import("@prisma/client").$Enums.PlatformRole;
        activeCompanyId: string | null;
    }>;
    me(user: RequestUser): Promise<RequestUser>;
    changePassword(user: RequestUser, dto: ChangePasswordDto): Promise<{
        accessToken: string;
        mustChangePassword: boolean;
        platformRole: import("@prisma/client").$Enums.PlatformRole;
        activeCompanyId: string | null;
    }>;
    switchCompany(user: RequestUser, dto: SwitchCompanyDto): Promise<{
        accessToken: string;
        mustChangePassword: boolean;
        platformRole: import("@prisma/client").$Enums.PlatformRole;
        activeCompanyId: string | null;
    }>;
    recoverQuestions(dto: RecoverGetQuestionsDto): Promise<{
        questions: string[];
    }>;
    recoverVerify(dto: RecoverVerifyDto): Promise<{
        recoveryToken: string;
    }>;
    recoverReset(dto: RecoverResetDto): Promise<{
        accessToken: string;
        mustChangePassword: boolean;
        platformRole: import("@prisma/client").$Enums.PlatformRole;
        activeCompanyId: string | null;
    }>;
}
