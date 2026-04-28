import { User } from './User.entity';
import { Invoice } from './Invoice.entity';
import { Client } from './Client.entity';
import { Expense } from './Expense.entity';
export declare class Company {
    id: string;
    name: string;
    owner_id: string;
    owner: User;
    users: User[];
    invoices: Invoice[];
    clients: Client[];
    expenses: Expense[];
}
