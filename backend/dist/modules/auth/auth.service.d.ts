import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly jwtExpiresIn;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService);
    private issueAccessToken;
    login(email: string, password: string): Promise<{
        accessToken: string;
        mustChangePassword: boolean;
        platformRole: import("@prisma/client").$Enums.PlatformRole;
        activeCompanyId: string | null;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        accessToken: string;
        mustChangePassword: boolean;
        platformRole: import("@prisma/client").$Enums.PlatformRole;
        activeCompanyId: string | null;
    }>;
    switchCompany(userId: string, companyId: string): Promise<{
        accessToken: string;
        mustChangePassword: boolean;
        platformRole: import("@prisma/client").$Enums.PlatformRole;
        activeCompanyId: string | null;
    }>;
    getRecoveryQuestions(email: string): Promise<{
        questions: string[];
    }>;
    verifyRecoveryAnswers(email: string, answers: {
        question: string;
        answer: string;
    }[]): Promise<{
        recoveryToken: string;
    }>;
    resetPasswordWithRecoveryToken(recoveryToken: string, newPassword: string): Promise<{
        accessToken: string;
        mustChangePassword: boolean;
        platformRole: import("@prisma/client").$Enums.PlatformRole;
        activeCompanyId: string | null;
    }>;
    ensurePlatformAdmin(userId: string): Promise<boolean>;
}
