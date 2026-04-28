import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';

export type ExpenseDto = {
  id: string;
  businessId: string;
  amount: number;
  date: string;
  description: string;
  receiptUrl: string;
  status: string;
  createdBy: string;
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private api = inject(ApiService);

  listByBusiness(businessId: string, tenantId?: string) {
    return this.api.get<any[]>(`/expenses/by-business/${encodeURIComponent(businessId)}`);
  }

  getCategories(tenantId?: string) {
    return this.api.get<any[]>('/expenses/categories');
  }

  create(payload: any, tenantId?: string) {
    return this.api.post<any>('/expenses', payload);
  }

  update(id: string, payload: any, tenantId?: string) {
    return this.api.patch<any>(`/expenses/${encodeURIComponent(id)}`, payload);
  }

  remove(id: string, tenantId?: string) {
    return this.api.delete<{ success: boolean }>(`/expenses/${encodeURIComponent(id)}`);
  }
}
