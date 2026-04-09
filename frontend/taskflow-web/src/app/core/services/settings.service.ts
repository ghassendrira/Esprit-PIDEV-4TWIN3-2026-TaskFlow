import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private getActiveTenantId(): string {
    return localStorage.getItem('activeTenantId') || '';
  }

  private getHeaders(tenantIdOverride?: string): { headers: HttpHeaders } {
    let headers = new HttpHeaders();

    const token = this.auth.token();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const tenantId = tenantIdOverride ?? this.getActiveTenantId();
    if (tenantId) {
      headers = headers.set('X-Tenant-Id', tenantId);
    }

    return { headers };
  }

  countries(): Observable<any[]> {
    return this.api.get('/tenant/countries', this.getHeaders());
  }
  categories(): Observable<any[]> {
    return this.api.get('/business/categories', this.getHeaders());
  }
  getAllTenants(): Observable<any[]> {
    return this.api.get('/tenant/all', this.getHeaders());
  }
  tenant(): Observable<any> {
    return this.api.get('/tenant/current', this.getHeaders());
  }
  updateTenant(payload: any): Observable<any> {
    return this.api.patch('/tenant/update', payload, this.getHeaders());
  }
  getBusinesses(): Observable<any[]> {
    return this.api.get('/business/list', this.getHeaders());
  }

  getBusinessesForTenant(tenantId: string): Observable<any[]> {
    return this.api.get('/business/list', this.getHeaders(tenantId));
  }
  businesses(): Observable<any[]> {
    return this.api.get('/business/list', this.getHeaders());
  }
  createBusiness(payload: any): Observable<any> {
    return this.api.post('/business/create', payload, this.getHeaders());
  }
  updateBusiness(id: string, payload: any): Observable<any> {
    return this.api.patch(`/business/${id}/update`, payload, this.getHeaders());
  }

  requestTenant(payload: any): Observable<any> {
    return this.api.post('/tenant/request', payload, this.getHeaders());
  }
}
