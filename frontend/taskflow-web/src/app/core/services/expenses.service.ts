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
    const headers = tenantId ? new HttpHeaders().set('X-Tenant-Id', tenantId) : undefined;
    return this.api.get<any[]>(`/expenses/by-business/${encodeURIComponent(businessId)}`, headers ? { headers } : undefined);
  }

  create(payload: any, tenantId?: string) {
    const headers = tenantId ? new HttpHeaders().set('X-Tenant-Id', tenantId) : undefined;
    return this.api.post<any>('/expenses', payload, headers ? { headers } : undefined);
  }

  update(id: string, payload: any, tenantId?: string) {
    const headers = tenantId ? new HttpHeaders().set('X-Tenant-Id', tenantId) : undefined;
    return this.api.patch<any>(`/expenses/${encodeURIComponent(id)}`, payload, headers ? { headers } : undefined);
  }

  remove(id: string, tenantId?: string) {
    const headers = tenantId ? new HttpHeaders().set('X-Tenant-Id', tenantId) : undefined;
    return this.api.delete<{ success: boolean }>(`/expenses/${encodeURIComponent(id)}`, headers ? { headers } : undefined);
  }
}
