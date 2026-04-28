import { BusinessService } from './business.service';
import { Invoice } from '../entities/Invoice.entity';
import { Client } from '../entities/Client.entity';
import { Expense } from '../entities/Expense.entity';
export declare class BusinessController {
    private readonly businessService;
    constructor(businessService: BusinessService);
    getInvoices(companyId: string): Promise<Invoice[]>;
    getInvoiceById(id: string, companyId: string): Promise<Invoice>;
    createInvoice(companyId: string, invoiceData: Partial<Invoice>): Promise<Invoice>;
    getClients(companyId: string): Promise<Client[]>;
    createClient(companyId: string, clientData: Partial<Client>): Promise<Client>;
    getExpenses(companyId: string): Promise<Expense[]>;
    createExpense(companyId: string, expenseData: Partial<Expense>): Promise<Expense>;
}
