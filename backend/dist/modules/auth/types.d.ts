import { PlatformRole } from '@prisma/client';
export type JwtPayload = {
    sub: string;
    email: string;
    platformRole: PlatformRole;
    activeCompanyId?: string | null;
    purpose?: 'access' | 'recovery';
};
export type RequestUser = {
    id: string;
    email: string;
    platformRole: PlatformRole;
    activeCompanyId: string | null;
    mustChangePassword: boolean;
};
