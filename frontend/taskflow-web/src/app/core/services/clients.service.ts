import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';

export interface ClientDto {
  id: string;
  businessId: string;
  assignedUserId?: string | null;
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

  listAll() {
    return this.api.get<ClientDto[]>('/clients/all');
  }

  listByBusiness(businessId: string, tenantId?: string, employeeUserId?: string) {
    let headers: HttpHeaders | undefined;
    if (tenantId) {
      headers = (headers ?? new HttpHeaders()).set('X-Tenant-Id', tenantId);
    }
    if (employeeUserId) {
      headers = (headers ?? new HttpHeaders()).set('X-Employee-User-Id', employeeUserId);
    }
    return this.api.get<ClientDto[]>(`/clients/by-business/${encodeURIComponent(businessId)}`, headers ? { headers } : undefined);
  }

  create(payload: {
    businessId: string;
    assignedUserId?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
  }, tenantId?: string) {
    return this.api.post<ClientDto>('/clients', payload);
  }

  update(
    id: string,
    payload: {
      name?: string;
      assignedUserId?: string | null;
      email?: string;
      phone?: string;
      address?: string;
      taxNumber?: string;
    },
    tenantId?: string
  ) {
    return this.api.patch<ClientDto>(`/clients/${encodeURIComponent(id)}`, payload);
  }

  remove(id: string, tenantId?: string) {
    return this.api.delete<{ success: boolean }>(`/clients/${encodeURIComponent(id)}`);
  }
}
