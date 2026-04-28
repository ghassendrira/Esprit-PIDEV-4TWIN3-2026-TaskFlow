import { Company } from './Company.entity';
export declare enum UserRole {
    OWNER = "OWNER",
    ADMIN = "ADMIN",
    EMPLOYEE = "EMPLOYEE"
}
export declare class User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role: string;
    company_id: string;
    company: Company;
    is_owner: boolean;
    ownedCompanies: Company[];
    createdAt: Date;
    updatedAt: Date;
}
