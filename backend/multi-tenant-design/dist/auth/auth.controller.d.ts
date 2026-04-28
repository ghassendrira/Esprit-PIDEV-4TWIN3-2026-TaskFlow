import { AuthService } from './auth.service';
import { UserRole } from '../entities/User.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    createCompany(req: any, name: string): Promise<{
        access_token: string;
        company: {
            id: string;
            name: string;
        };
    }>;
    switchCompany(req: any, companyId: string): Promise<{
        access_token: string;
        company: {
            id: string;
            name: string;
        };
    }>;
    createUser(req: any, userData: {
        email: string;
        role: UserRole;
    }): Promise<import("../entities/User.entity").User>;
}
