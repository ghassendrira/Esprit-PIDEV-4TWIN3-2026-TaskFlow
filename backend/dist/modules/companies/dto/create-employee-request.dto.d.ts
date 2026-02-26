import { CompanyRole } from '@prisma/client';
export declare class CreateEmployeeRequestDto {
    email: string;
    firstName: string;
    lastName: string;
    role: CompanyRole;
    note?: string;
}
