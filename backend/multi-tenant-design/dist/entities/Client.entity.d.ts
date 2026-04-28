import { BaseTenantEntity } from './BaseTenant.entity';
import { Company } from './Company.entity';
export declare class Client extends BaseTenantEntity {
    name: string;
    email: string;
    phone: string;
    address: string;
    company: Company;
}
