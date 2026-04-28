import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';

export interface ClientDto {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private api = inject(ApiService);

  listByBusiness(businessId: string, tenantId?: string) {
    const headers = tenantId ? new HttpHeaders().set('X-Tenant-Id', tenantId) : undefined;
    return this.api.get<ClientDto[]>(`/clients/by-business/${encodeURIComponent(businessId)}`, headers ? { headers } : undefined);
  }

  create(payload: {
    businessId: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
  }) {
    return this.api.post<ClientDto>('/clients', payload);
  }

  update(
    id: string,
    payload: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      taxNumber?: string;
    },
  ) {
    return this.api.patch<ClientDto>(`/clients/${encodeURIComponent(id)}`, payload);
  }

  remove(id: string) {
    return this.api.delete<{ success: boolean }>(`/clients/${encodeURIComponent(id)}`);
  }
}
