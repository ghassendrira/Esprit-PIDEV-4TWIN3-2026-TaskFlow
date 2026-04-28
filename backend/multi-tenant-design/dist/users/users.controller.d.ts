import { AuthService } from '../auth/auth.service';
export declare class UsersController {
    private readonly authService;
    constructor(authService: AuthService);
    createEmployee(req: any, tenantId: string, userData: {
        email: string;
        role: string;
        firstName: string;
        lastName: string;
    }): Promise<import("../entities/User.entity").User>;
    listEmployees(req: any, tenantId: string): Promise<import("../entities/User.entity").User[]>;
}
