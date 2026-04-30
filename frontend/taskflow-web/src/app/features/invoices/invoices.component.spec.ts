import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { of } from 'rxjs';
import { InvoicesComponent } from './invoices.component';
import { SettingsService } from '../../core/services/settings.service';
import { ClientsService } from '../../core/services/clients.service';
import { InvoicesService } from '../../core/services/invoices.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { InvoicePdfService } from '../../core/services/invoice-pdf.service';
import { BusinessSelectionService } from '../../core/services/business-selection.service';
import { MlService } from '../../core/services/ml.service';
import { Router } from '@angular/router';

const storage = new Map<string, string>();

if (!(globalThis as any).__ng_testbed_initialized__) {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
  (globalThis as any).__ng_testbed_initialized__ = true;
}

(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
  clear: () => void storage.clear(),
};

describe('InvoicesComponent', () => {
  const settingsService = {
    getAllTenants: () => of([]),
    getBusinesses: () => of([]),
    getBusinessesForTenant: () =>
      of([
        { id: 'business-1', name: 'Business 1', companyId: 'company-1', tenantId: 'company-1' },
        { id: 'business-2', name: 'Business 2', companyId: 'company-1', tenantId: 'company-1' },
      ]),
  };

  const clientsService = { listByBusiness: () => of([]) };
  const invoicesService = { listByBusiness: () => of([]) };
  const authService = {
    roles: () => [],
    getEmployeesForTenant: () => of([]),
  };
  const themeService = {};
  const pdfService = {};
  const mlService = { getInvoiceRisk: () => of({ risk_level: 'LOW', is_anomaly: false }) };
  const router = { navigate: vi.fn() };

  let selectionService: BusinessSelectionService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [InvoicesComponent],
      providers: [
        BusinessSelectionService,
        { provide: SettingsService, useValue: settingsService },
        { provide: ClientsService, useValue: clientsService },
        { provide: InvoicesService, useValue: invoicesService },
        { provide: AuthService, useValue: authService },
        { provide: ThemeService, useValue: themeService },
        { provide: InvoicePdfService, useValue: pdfService },
        { provide: MlService, useValue: mlService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    selectionService = TestBed.inject(BusinessSelectionService);
  });

  it('loads only the selected company businesses and resets the selected business on company change', () => {
    selectionService.setSelectedBusiness('legacy-business', 'legacy-company');

    const fixture = TestBed.createComponent(InvoicesComponent);
    const component = fixture.componentInstance;

    component.onTenantChange('company-1');

    expect(component.businesses()).toEqual([
      { id: 'business-1', name: 'Business 1', companyId: 'company-1', tenantId: 'company-1' },
      { id: 'business-2', name: 'Business 2', companyId: 'company-1', tenantId: 'company-1' },
    ]);
    expect(selectionService.selectedTenantId()).toBe('company-1');
    expect(selectionService.selectedBusinessId()).toBe('business-1');
  });
});
