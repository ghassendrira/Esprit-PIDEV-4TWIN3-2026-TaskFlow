import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/User.entity';
import { Company } from '../entities/Company.entity';
export declare class AuthService {
    private readonly userRepository;
    private readonly companyRepository;
    private readonly jwtService;
    constructor(userRepository: Repository<User>, companyRepository: Repository<Company>, jwtService: JwtService);
    createCompany(ownerId: string, companyName: string): Promise<{
        access_token: string;
        company: {
            id: string;
            name: string;
        };
    }>;
    switchCompany(ownerId: string, companyId: string): Promise<{
        access_token: string;
        company: {
            id: string;
            name: string;
        };
    }>;
    createUser(companyId: string, userData: {
        email: string;
        role: string;
        firstName?: string;
        lastName?: string;
    }): Promise<User>;
    getUsersByCompany(companyId: string): Promise<User[]>;
}
