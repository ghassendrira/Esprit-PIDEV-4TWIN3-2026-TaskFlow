import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface CompanySetupPayload {
  name?: string;
  address?: string;
  slug?: string;
  logoUrl?: string;
  phone?: string;
  website?: string;
  country?: string;
  matricule?: string;
}

export interface CreateBusinessPayload {
  name: string;
  logoUrl?: string;
  currency: string;
  taxRate: number;
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private api = inject(ApiService);

  companySetup(payload: CompanySetupPayload): Observable<any> {
    return this.api.post('/onboarding/company-setup', payload);
  }

  createBusiness(payload: CreateBusinessPayload): Observable<any> {
    return this.api.post('/onboarding/create-business', payload);
  }

  status(): Observable<{ isSetupCompleted: boolean; tenantSlug: string }> {
    return this.api.get('/onboarding/status');
  }
}
