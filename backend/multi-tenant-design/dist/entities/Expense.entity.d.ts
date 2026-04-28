import { BaseTenantEntity } from './BaseTenant.entity';
import { Company } from './Company.entity';
export declare class Expense extends BaseTenantEntity {
    description: string;
    amount: number;
    category: string;
    company: Company;
}
