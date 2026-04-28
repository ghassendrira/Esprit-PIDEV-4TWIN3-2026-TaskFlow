import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private _tenantId = signal<string>(localStorage.getItem('activeTenantId') ?? '');
  private tenantNameSig = signal<string>('TaskFlow');
  private logoSig = signal<string | null>(null);

  currentTenantId = computed(() => this._tenantId());
  tenantName = computed(() => this.tenantNameSig());
  logo = computed(() => this.logoSig());

  setActiveTenant(id: string) {
    localStorage.setItem('activeTenantId', id);
    this._tenantId.set(id);
  }

  setTenant(id: string | null, name?: string, logo?: string | null) {
    const finalId = id ?? '';
    this._tenantId.set(finalId);
    if (name) this.tenantNameSig.set(name);
    this.logoSig.set(logo ?? null);
    localStorage.setItem('activeTenantId', finalId);
  }
}

