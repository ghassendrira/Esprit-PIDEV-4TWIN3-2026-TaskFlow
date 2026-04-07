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
    return this.api.get<any[]>(`/invoices/by-business/${encodeURIComponent(businessId)}`);
  }

  create(payload: any, tenantId?: string) {
    return this.api.post<any>('/invoices', payload);
  }

  update(id: string, payload: any, tenantId?: string) {
    return this.api.patch<any>(`/invoices/${encodeURIComponent(id)}`, payload);
  }

  remove(id: string, tenantId?: string) {
    return this.api.delete<{ success: boolean }>(`/invoices/${encodeURIComponent(id)}`);
  }

  getById(id: string, tenantId?: string) {
    return this.api.get<any>(`/invoices/${encodeURIComponent(id)}`);
  }

  sendByEmail(id: string, tenantId?: string) {
    return this.api.post<{ success: boolean }>(`/invoices/${encodeURIComponent(id)}/send`, {});
  }
}
