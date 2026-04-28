export type { AuthUser, Role } from '../services/auth.service';

export interface Tenant {
  id: string;
  name: string;
}

export interface Invoice {
  id: string;
  clientName: string;
  amount: number;
  status: 'PAID' | 'DUE' | 'OVERDUE';
  issuedAt: string;
}

