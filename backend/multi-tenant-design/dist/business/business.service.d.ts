import { Repository } from 'typeorm';
import { Invoice } from '../entities/Invoice.entity';
import { Client } from '../entities/Client.entity';
import { Expense } from '../entities/Expense.entity';
export declare class BusinessService {
    private readonly invoiceRepository;
    private readonly clientRepository;
    private readonly expenseRepository;
    constructor(invoiceRepository: Repository<Invoice>, clientRepository: Repository<Client>, expenseRepository: Repository<Expense>);
    getExpenses(companyId: string): Promise<Expense[]>;
    createExpense(companyId: string, expenseData: Partial<Expense>): Promise<Expense>;
    getInvoices(companyId: string): Promise<Invoice[]>;
    getInvoiceById(id: string, companyId: string): Promise<Invoice>;
    createInvoice(companyId: string, invoiceData: Partial<Invoice>): Promise<Invoice>;
    getClients(companyId: string): Promise<Client[]>;
    createClient(companyId: string, clientData: Partial<Client>): Promise<Client>;
}
