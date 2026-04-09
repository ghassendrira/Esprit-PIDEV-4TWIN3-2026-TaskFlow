import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BusinessSelectionService {
  private _selectedBusinessId = signal<string>(this.getSafeItem('activeBusinessId'));
  private _selectedTenantId = signal<string>(this.getSafeItem('activeTenantId'));

  selectedBusinessId = computed(() => this._selectedBusinessId());
  selectedTenantId = computed(() => this._selectedTenantId());

  private getSafeItem(key: string): string {
    const val = localStorage.getItem(key);
    if (!val || val === 'undefined' || val === 'null') return '';
    return val;
  }

  setSelectedBusiness(businessId: string, tenantId: string) {
    const bId = (businessId && businessId !== 'undefined') ? businessId : '';
    const tId = (tenantId && tenantId !== 'undefined') ? tenantId : '';

    this._selectedBusinessId.set(bId);
    this._selectedTenantId.set(tId);

    if (bId) localStorage.setItem('activeBusinessId', bId);
    else localStorage.removeItem('activeBusinessId');

    if (tId) localStorage.setItem('activeTenantId', tId);
    else localStorage.removeItem('activeTenantId');
  }

  clearSelection() {
    this._selectedBusinessId.set('');
    this._selectedTenantId.set('');
    localStorage.removeItem('activeBusinessId');
    localStorage.removeItem('activeTenantId');
  }
}
