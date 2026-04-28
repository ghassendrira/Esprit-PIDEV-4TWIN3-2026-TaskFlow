import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';

export type InvoiceDto = {
  id: string;
  businessId: string;
  clientId: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  taxAmount: number;
  notes: string;
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private api = inject(ApiService);

  listByBusiness(businessId: string, tenantId?: string) {
    const headers = tenantId ? new HttpHeaders().set('X-Tenant-Id', tenantId) : undefined;
    return this.api.get<any[]>(`/invoices/by-business/${encodeURIComponent(businessId)}`, headers ? { headers } : undefined);
  }

  create(payload: any, tenantId?: string) {
    const headers = tenantId ? new HttpHeaders().set('X-Tenant-Id', tenantId) : undefined;
    return this.api.post<any>('/invoices', payload, headers ? { headers } : undefined);
  }

  update(id: string, payload: any, tenantId?: string) {
    const headers = tenantId ? new HttpHeaders().set('X-Tenant-Id', tenantId) : undefined;
    return this.api.patch<any>(`/invoices/${encodeURIComponent(id)}`, payload, headers ? { headers } : undefined);
  }

  remove(id: string, tenantId?: string) {
    const headers = tenantId ? new HttpHeaders().set('X-Tenant-Id', tenantId) : undefined;
    return this.api.delete<{ success: boolean }>(`/invoices/${encodeURIComponent(id)}`, headers ? { headers } : undefined);
  }
}
