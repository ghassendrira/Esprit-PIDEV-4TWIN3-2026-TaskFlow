import { BaseTenantEntity } from './BaseTenant.entity';
import { Company } from './Company.entity';
export declare class Invoice extends BaseTenantEntity {
    invoiceNumber: string;
    amount: number;
    status: string;
    dueDate: Date;
    company: Company;
}
