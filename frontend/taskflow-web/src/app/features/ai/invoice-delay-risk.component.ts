import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ClientsService, ClientDto } from '../../core/services/clients.service';
import { InvoicesService } from '../../core/services/invoices.service';
import { SettingsService } from '../../core/services/settings.service';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

type DelayModelSnapshot = {
  modelName: string;
  trainedAt: string;
  trainingExamples: number;
  featureCount: number;
  trainingAccuracy: number;
};

type DelayPrediction = {
  input: {
    amount: number;
    dueDays: number;
    clientLateRatio: number;
    previousLateCount: number;
    openInvoiceCount: number;
    overdueInvoiceCount: number;
  };
  label: 'late' | 'on_time';
  riskProbability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  scores: Array<{ label: 'late' | 'on_time'; score: number; probability: number }>;
};

type DelayForm = {
  amount: number;
  dueDays: number;
  clientLateRatio: number;
  previousLateCount: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
};

type InvoiceRecord = {
  id: string;
  clientId: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  createdAt?: string;
  payments?: Array<{ paymentDate: string; amount: number }>;
};

type ClientSummary = {
  totalInvoices: number;
  paidInvoices: number;
  latePaidInvoices: number;
  lateRatio: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  latestAmount: number;
  latestDueDays: number;
};

@Component({
  selector: 'tf-invoice-delay-risk',
  standalone: true,
  imports: [CommonModule, TfCardComponent, TranslatePipe],
  template: `
    <header class="ai-header">
      <div>
        <h1 class="ai-title">{{ 'ai-risk.title' | t }}</h1>
        <p class="ai-subtitle">{{ 'ai-risk.subtitle' | t }}</p>
      </div>
      <div class="ai-pill" *ngIf="model() as currentModel; else loadingModel">
        <span class="dot"></span>
        <span>{{ currentModel.modelName }}</span>
      </div>
      <ng-template #loadingModel>
        <div class="ai-pill">
          <span class="dot pulse"></span>
          <span>{{ 'common.loading' | t }}</span>
        </div>
      </ng-template>
    </header>

    <tf-card class="panel selector-panel">
      <div class="panel-title">{{ 'ai-risk.client-context' | t }}</div>
      <div class="input-grid">
        <label class="field" *ngIf="isAdmin()">
          <span>{{ 'invoice.company' | t }}</span>
          <select [value]="activeTenantId()" (change)="onTenantChange($any($event.target).value)">
            <option value="">{{ 'invoice.company' | t }}</option>
            <option *ngFor="let tenant of tenants()" [value]="tenant.id">{{ tenant.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ 'ai-risk.business' | t }}</span>
          <select [value]="selectedBusinessId()" (change)="onBusinessChange($any($event.target).value)">
            <option value="">{{ 'ai-risk.select-business' | t }}</option>
            <option *ngFor="let business of businesses()" [value]="business.id">{{ business.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>{{ 'ai-risk.client' | t }}</span>
          <select [value]="selectedClientId()" (change)="onClientChange($any($event.target).value)">
            <option value="">{{ 'ai-risk.select-client' | t }}</option>
            <option *ngFor="let client of clients()" [value]="client.id">{{ client.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>Invoice file (PDF/image)</span>
          <input type="file" accept="application/pdf,image/*" (change)="onInvoiceFileSelected($event)" />
        </label>
      </div>
      <p class="muted hint" *ngIf="contextError()">{{ contextError() }}</p>
      <div class="muted hint">{{ 'ai-risk.auto-fill-note' | t }}</div>
      <div class="summary-grid" *ngIf="clientSummary() as summary; else noClientSummary">
        <div class="summary-item"><span>{{ 'ai-risk.total-invoices' | t }}</span><strong>{{ summary.totalInvoices }}</strong></div>
        <div class="summary-item"><span>{{ 'ai-risk.paid-invoices' | t }}</span><strong>{{ summary.paidInvoices }}</strong></div>
        <div class="summary-item"><span>{{ 'ai-risk.late-invoices' | t }}</span><strong>{{ summary.latePaidInvoices }}</strong></div>
        <div class="summary-item"><span>{{ 'ai-risk.open-invoices' | t }}</span><strong>{{ summary.openInvoiceCount }}</strong></div>
        <div class="summary-item"><span>Overdue invoices</span><strong>{{ summary.overdueInvoiceCount }}</strong></div>
        <div class="summary-item"><span>{{ 'ai-risk.late-ratio' | t }}</span><strong>{{ (summary.lateRatio * 100) | number:'1.0-1' }}%</strong></div>
        <div class="summary-item"><span>{{ 'ai-risk.latest-amount' | t }}</span><strong>{{ summary.latestAmount | number:'1.0-2' }}</strong></div>
      </div>
      <ng-template #noClientSummary>
        <p class="muted hint" *ngIf="!selectedClientId()">{{ 'ai-risk.no-client-data' | t }}</p>
        <p class="muted hint" *ngIf="selectedClientId()">This client does not have invoice history yet, so the model keeps the default features.</p>
      </ng-template>
    </tf-card>

    <section class="ai-grid">
      <tf-card class="panel form-panel">
        <div class="panel-title">{{ 'ai-risk.input-label' | t }}</div>
        <div class="input-grid">
          <label class="field">
            <span>{{ 'ai-risk.amount' | t }}</span>
            <input type="number" min="0" step="0.01" [value]="form().amount" (input)="onFieldChange('amount', $any($event.target).value)" />
          </label>
          <label class="field">
            <span>{{ 'ai-risk.due-days' | t }}</span>
            <input type="number" min="0" step="1" [value]="form().dueDays" (input)="onFieldChange('dueDays', $any($event.target).value)" />
          </label>
          <label class="field">
            <span>{{ 'ai-risk.client-late-ratio' | t }}</span>
            <input type="number" min="0" max="1" step="0.01" [value]="form().clientLateRatio" (input)="onFieldChange('clientLateRatio', $any($event.target).value)" />
          </label>
          <label class="field">
            <span>{{ 'ai-risk.previous-late-count' | t }}</span>
            <input type="number" min="0" step="1" [value]="form().previousLateCount" (input)="onFieldChange('previousLateCount', $any($event.target).value)" />
          </label>
          <label class="field">
            <span>{{ 'ai-risk.open-invoices' | t }}</span>
            <input type="number" min="0" step="1" [value]="form().openInvoiceCount" (input)="onFieldChange('openInvoiceCount', $any($event.target).value)" />
          </label>
          <label class="field">
            <span>Overdue invoices</span>
            <input type="number" min="0" step="1" [value]="form().overdueInvoiceCount" (input)="onFieldChange('overdueInvoiceCount', $any($event.target).value)" />
          </label>
        </div>
        <div class="actions">
          <button class="primary-btn" type="button" [disabled]="loading()" (click)="predict()">
            {{ loading() ? ('common.loading' | t) : ('ai-risk.predict' | t) }}
          </button>
          <button class="ghost-btn" type="button" [disabled]="retraining()" (click)="retrain()">
            {{ retraining() ? ('common.loading' | t) : ('ai-risk.retrain' | t) }}
          </button>
        </div>
      </tf-card>

      <tf-card class="panel result-panel">
        <div class="panel-title">{{ 'ai-risk.best-prediction' | t }}</div>
        <ng-container *ngIf="prediction() as currentPrediction; else emptyState">
          <div class="prediction-label">
            {{ currentPrediction.label === 'late' ? ('ai-risk.high-risk' | t) : ('ai-risk.low-risk' | t) }}
          </div>
          <div class="metric-row">
            <span>{{ 'ai-risk.risk-probability' | t }}</span>
            <strong>{{ (currentPrediction.riskProbability * 100) | number:'1.0-1' }}%</strong>
          </div>
          <div class="metric-row">
            <span>{{ 'ai-risk.risk-level' | t }}</span>
            <strong>{{ riskLevelLabel(currentPrediction.riskLevel) | t }}</strong>
          </div>
          <div class="metric-row">
            <span>{{ 'ai.confidence' | t }}</span>
            <strong>{{ (currentPrediction.confidence * 100) | number:'1.0-1' }}%</strong>
          </div>
          <div class="score-list">
            <div class="score-item" *ngFor="let score of currentPrediction.scores">
              <span>{{ score.label }}</span>
              <strong>{{ (score.probability * 100) | number:'1.0-1' }}%</strong>
            </div>
          </div>
        </ng-container>
        <ng-template #emptyState>
          <p class="muted">{{ 'ai-risk.no-result' | t }}</p>
        </ng-template>
      </tf-card>
    </section>

    <tf-card class="panel model-panel">
      <div class="panel-title">{{ 'ai-risk.model-card' | t }}</div>
      <ng-container *ngIf="model() as currentModel; else modelError">
        <div class="stats-grid">
          <div class="stat"><span>{{ 'ai.training-examples' | t }}</span><strong>{{ currentModel.trainingExamples }}</strong></div>
          <div class="stat"><span>{{ 'ai-risk.feature-count' | t }}</span><strong>{{ currentModel.featureCount }}</strong></div>
          <div class="stat"><span>{{ 'ai.training-accuracy' | t }}</span><strong>{{ (currentModel.trainingAccuracy * 100) | number:'1.0-1' }}%</strong></div>
          <div class="stat"><span>{{ 'ai-risk.model-name' | t }}</span><strong>{{ currentModel.modelName }}</strong></div>
        </div>
      </ng-container>
      <ng-template #modelError>
        <p class="muted">{{ 'ai-risk.load-error' | t }}</p>
      </ng-template>
    </tf-card>
  `,
  styles: [`
    :host { display: block; }
    .ai-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .ai-title { margin: 0; font-size: 24px; line-height: 1.15; letter-spacing: -0.03em; }
    .ai-subtitle { margin: 6px 0 0; color: var(--tf-muted); font-size: 13px; }
    .ai-pill { display: inline-flex; align-items: center; gap: 10px; height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--tf-border); background: var(--tf-card); color: var(--tf-muted); font-size: 12px; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--tf-primary); }
    .pulse { animation: pulse 1.2s ease-in-out infinite; }
    .ai-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 12px; }
    .panel { min-height: 100%; }
    .panel-title { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--tf-muted); margin-bottom: 12px; }
    .selector-panel { margin-bottom: 12px; }
    .input-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .field { display: grid; gap: 6px; font-size: 12px; color: var(--tf-muted); }
    .field select {
      width: 100%;
      border-radius: 12px;
      border: 1px solid var(--tf-border);
      background: var(--tf-surface);
      color: var(--tf-on-surface);
      padding: 12px;
      font: inherit;
      outline: none;
    }
    .field input { width: 100%; border-radius: 12px; border: 1px solid var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface); padding: 12px; font: inherit; outline: none; }
    .field input:focus, .field select:focus { border-color: var(--tf-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--tf-primary) 14%, transparent); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .primary-btn, .ghost-btn { border: 1px solid var(--tf-border); border-radius: 999px; height: 40px; padding: 0 16px; font-weight: 700; cursor: pointer; transition: transform .15s ease, border-color .15s ease, background .15s ease; }
    .primary-btn { background: var(--tf-primary); color: white; border-color: var(--tf-primary); }
    .ghost-btn { background: transparent; color: var(--tf-on-surface); }
    .primary-btn:hover, .ghost-btn:hover { transform: translateY(-1px); }
    .primary-btn:disabled, .ghost-btn:disabled { opacity: .65; cursor: wait; transform: none; }
    .result-panel { display: grid; gap: 12px; }
    .prediction-label { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; }
    .metric-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--tf-surface-2); color: var(--tf-muted); }
    .metric-row strong { color: var(--tf-on-surface); }
    .score-list { display: grid; gap: 8px; }
    .score-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--tf-surface); }
    .muted { color: var(--tf-muted); margin: 0; }
    .hint { margin-top: 10px; font-size: 12px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
    .summary-item { padding: 12px; border-radius: 12px; background: var(--tf-surface-2); display: grid; gap: 6px; }
    .summary-item span { color: var(--tf-muted); font-size: 12px; }
    .summary-item strong { font-size: 16px; }
    .model-panel { margin-top: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .stat { padding: 12px; border-radius: 12px; background: var(--tf-surface-2); display: grid; gap: 6px; }
    .stat span { color: var(--tf-muted); font-size: 12px; }
    .stat strong { font-size: 16px; }
    @keyframes pulse { 0%, 100% { opacity: .35; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.05); } }
    @media (max-width: 900px) {
      .ai-header { align-items: flex-start; flex-direction: column; }
      .ai-grid, .stats-grid, .input-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class InvoiceDelayRiskComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private settings = inject(SettingsService);
  private clientsApi = inject(ClientsService);
  private invoicesApi = inject(InvoicesService);
  private destroyRef = inject(DestroyRef);

  tenants = signal<Array<{ id: string; name: string }>>([]);
  businesses = signal<Array<{ id: string; name: string }>>([]);
  clients = signal<ClientDto[]>([]);
  invoices = signal<InvoiceRecord[]>([]);
  activeTenantId = signal<string>(localStorage.getItem('activeTenantId') || '');
  selectedBusinessId = signal<string>(localStorage.getItem('ai-risk-business-id') || '');
  selectedClientId = signal<string>(localStorage.getItem('ai-risk-client-id') || '');
  form = signal<DelayForm>({
    amount: 1200,
    dueDays: 30,
    clientLateRatio: 0,
    previousLateCount: 0,
    openInvoiceCount: 0,
    overdueInvoiceCount: 0,
  });
  clientSummary = signal<ClientSummary | null>(null);
  loading = signal(false);
  retraining = signal(false);
  loadingContext = signal(false);
  model = signal<DelayModelSnapshot | null>(null);
  prediction = signal<DelayPrediction | null>(null);
  contextError = signal<string>('');
  extracting = signal(false);

  isAdmin = () => {
    const roles = this.auth.roles() as string[];
    return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
  };

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.settings.getAllTenants().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (tenants) => {
          const simplified = (tenants || []).map((tenant) => ({ id: tenant.id, name: tenant.name || tenant.companyName || tenant.title || tenant.id }));
          this.tenants.set(simplified);
          const storedTenantId = this.activeTenantId();
          const nextTenantId = simplified.some((tenant) => tenant.id === storedTenantId) ? storedTenantId : simplified[0]?.id || '';
          if (nextTenantId) {
            this.onTenantChange(nextTenantId);
          }
        },
        error: () => this.tenants.set([]),
      });
    } else {
      this.loadBusinesses();
    }

    this.api
      .get<DelayModelSnapshot>('/ai/invoice-delay/model')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => this.model.set(snapshot),
        error: () => this.model.set(null),
      });
  }

  private tenantId(): string | undefined {
    const value = this.activeTenantId() || localStorage.getItem('activeTenantId') || '';
    return value || undefined;
  }

  private loadBusinesses(): void {
    const tenantId = this.tenantId();
    const request = tenantId ? this.settings.getBusinessesForTenant(tenantId) : this.settings.getBusinesses();

    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (businesses) => {
          const simplified = (businesses || []).map((business) => ({ id: business.id, name: business.name }));
          this.businesses.set(simplified);

          const storedBusinessId = this.selectedBusinessId();
          const nextBusinessId = simplified.some((business) => business.id === storedBusinessId)
            ? storedBusinessId
            : simplified[0]?.id || '';

          if (nextBusinessId) {
            this.onBusinessChange(nextBusinessId);
          }
        },
        error: () => this.businesses.set([]),
      });
  }

  onTenantChange(tenantId: string): void {
    this.activeTenantId.set(tenantId);
    if (tenantId) {
      localStorage.setItem('activeTenantId', tenantId);
    }

    this.selectedBusinessId.set('');
    this.selectedClientId.set('');
    localStorage.removeItem('ai-risk-business-id');
    localStorage.removeItem('ai-risk-client-id');
    this.businesses.set([]);
    this.clients.set([]);
    this.invoices.set([]);
    this.clientSummary.set(null);
    this.prediction.set(null);

    if (!tenantId) {
      return;
    }

    this.settings.getBusinessesForTenant(tenantId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (businesses) => {
        const simplified = (businesses || []).map((business) => ({ id: business.id, name: business.name }));
        this.businesses.set(simplified);
        if (simplified.length) {
          this.onBusinessChange(simplified[0].id);
        }
      },
      error: () => this.businesses.set([]),
    });
  }

  private loadBusinessContext(businessId: string): void {
    this.loadingContext.set(true);
    this.contextError.set('');
    const tenantId = this.tenantId();

    forkJoin({
      clients: this.clientsApi.listByBusiness(businessId, tenantId).pipe(
        catchError((err) => {
          const msg = err?.error?.message || err?.message || 'Failed to load clients.';
          this.contextError.set(String(msg));
          return of([] as ClientDto[]);
        }),
      ),
      invoices: this.invoicesApi.listByBusiness(businessId, tenantId).pipe(
        catchError((err) => {
          const msg = err?.error?.message || err?.message || 'Failed to load invoices.';
          this.contextError.set(this.contextError() ? this.contextError() : String(msg));
          return of([] as InvoiceRecord[]);
        }),
      ),
    })
      .pipe(
        finalize(() => this.loadingContext.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ clients, invoices }) => {
          this.clients.set(clients || []);
          this.invoices.set((invoices || []) as InvoiceRecord[]);

          const storedClientId = this.selectedClientId();
          const nextClientId = (clients || []).some((client) => client.id === storedClientId)
            ? storedClientId
            : clients?.[0]?.id || '';

          if (nextClientId) {
            this.onClientChange(nextClientId);
          } else {
            this.clientSummary.set(null);
            this.resetForm();
            this.prediction.set(null);
          }
        },
        error: () => {
          this.clients.set([]);
          this.invoices.set([]);
          this.clientSummary.set(null);
          this.resetForm();
          this.contextError.set(this.contextError() || 'Failed to load business context.');
        },
      });
  }

  private resetForm(): void {
    this.form.set({
      amount: 1200,
      dueDays: 30,
      clientLateRatio: 0,
      previousLateCount: 0,
      openInvoiceCount: 0,
      overdueInvoiceCount: 0,
    });
  }

  onFieldChange(field: keyof DelayForm, value: string): void {
    this.form.update((current) => ({
      ...current,
      [field]: Number(value),
    }));
  }

  onBusinessChange(businessId: string): void {
    this.selectedBusinessId.set(businessId);
    localStorage.setItem('ai-risk-business-id', businessId);
    this.selectedClientId.set('');
    localStorage.removeItem('ai-risk-client-id');
    this.clients.set([]);
    this.invoices.set([]);
    this.clientSummary.set(null);
    this.prediction.set(null);

    if (businessId) {
      this.loadBusinessContext(businessId);
    }
  }

  onClientChange(clientId: string): void {
    this.selectedClientId.set(clientId);
    if (clientId) {
      localStorage.setItem('ai-risk-client-id', clientId);
    } else {
      localStorage.removeItem('ai-risk-client-id');
    }

    this.applyClientHistory(clientId);
  }

  onInvoiceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    // allow uploading the same file again
    if (input) input.value = '';
    void this.extractFromInvoice(file);
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private async extractFromInvoice(file: File): Promise<void> {
    this.extracting.set(true);
    this.contextError.set('');

    const data = new FormData();
    data.append('file', file, file.name);

    this.api
      .post<{
        invoiceNumber: string;
        issueDate: string;
        dueDate: string;
        totalAmount: number | null;
        taxAmount: number | null;
        currency: string;
        supplierName: string;
      }>('/ocr/invoice', data)
      .pipe(
        finalize(() => this.extracting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          const totalAmount = typeof result?.totalAmount === 'number' ? result.totalAmount : null;
          const issue = this.parseDate(result?.issueDate || '');
          const due = this.parseDate(result?.dueDate || '');
          const dueDays =
            issue && due ? Math.max(0, Math.round((due.getTime() - issue.getTime()) / 86400000)) : null;

          this.form.update((current) => ({
            ...current,
            amount: totalAmount ?? current.amount,
            dueDays: dueDays ?? current.dueDays,
          }));
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'OCR failed.';
          this.contextError.set(String(msg));
        },
      });
  }

  private applyClientHistory(clientId: string): void {
    const clientInvoices = this.invoices().filter((invoice) => invoice.clientId === clientId);

    if (!clientInvoices.length) {
      this.clientSummary.set(null);
      this.form.update((current) => ({
        ...current,
        clientLateRatio: 0,
        previousLateCount: 0,
        openInvoiceCount: 0,
        overdueInvoiceCount: 0,
      }));
      this.prediction.set(null);
      return;
    }

    const today = this.startOfToday().getTime();

    // An invoice has a known outcome if it's PAID or if it's already OVERDUE
    const knownOutcomeInvoices = clientInvoices.filter((invoice) => {
      if (invoice.status === 'CANCELED') return false;
      if ((invoice.payments?.length ?? 0) > 0) return true; // PAID
      if (invoice.status === 'OVERDUE') return true;
      const dueTime = new Date(invoice.dueDate).getTime();
      return dueTime < today; // Technically overdue if due date is in the past
    });

    const lateInvoices = knownOutcomeInvoices.filter((invoice) => {
      // If paid, check if paid after due date
      const paymentDate = invoice.payments?.[0]?.paymentDate;
      if (paymentDate) {
        return new Date(paymentDate).getTime() > new Date(invoice.dueDate).getTime();
      }
      // If not paid but has known outcome, it must be overdue
      return true;
    });

    const paidInvoices = clientInvoices.filter((invoice) => (invoice.payments?.length ?? 0) > 0);
    const openInvoices = clientInvoices.filter((invoice) => (invoice.payments?.length ?? 0) === 0 && invoice.status !== 'CANCELED');
    const openInvoiceCount = openInvoices.length;
    const overdueInvoiceCount = clientInvoices.filter((invoice) => {
      const paymentMissing = (invoice.payments?.length ?? 0) === 0;
      return invoice.status === 'OVERDUE' || (paymentMissing && new Date(invoice.dueDate).getTime() < today);
    }).length;

    const lateRatio = knownOutcomeInvoices.length ? lateInvoices.length / knownOutcomeInvoices.length : 0;
    // latestAmount: montant de la facture non payée la plus récente, sinon 0
    const latestOpen = openInvoices.length > 0 ? openInvoices[0] : null;
    const latestAmount = Number(latestOpen?.totalAmount ?? 0);
    const latestDueDays = latestOpen
      ? Math.max(0, Math.round((new Date(latestOpen.dueDate).getTime() - new Date(latestOpen.issueDate).getTime()) / 86400000))
      : 30;

    this.clientSummary.set({
      totalInvoices: clientInvoices.length,
      paidInvoices: paidInvoices.length,
      latePaidInvoices: lateInvoices.length, // Now includes overdue
      lateRatio,
      openInvoiceCount,
      overdueInvoiceCount,
      latestAmount,
      latestDueDays,
    });

    this.form.set({
      amount: latestAmount || 1200,
      dueDays: latestDueDays || 30,
      clientLateRatio: lateRatio,
      previousLateCount: lateInvoices.length,
      openInvoiceCount,
      overdueInvoiceCount,
    });

    this.predict();
  }

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  predict(): void {
    this.loading.set(true);
    const payload = {
      ...this.form(),
      businessId: this.selectedBusinessId() || undefined,
      clientId: this.selectedClientId() || undefined,
    };
    this.api
      .post<DelayPrediction>('/ai/invoice-delay/predict', payload)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => this.prediction.set(result),
        error: () => this.prediction.set(null),
      });
  }

  retrain(): void {
    this.retraining.set(true);
    this.api
      .post<DelayModelSnapshot>('/ai/invoice-delay/train', {
        businessId: this.selectedBusinessId() || undefined,
      })
      .pipe(
        finalize(() => this.retraining.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (snapshot) => this.model.set(snapshot),
        error: () => this.model.set(null),
      });
  }

  riskLevelLabel(level: 'LOW' | 'MEDIUM' | 'HIGH'): string {
    if (level === 'HIGH') return 'ai-risk.high-risk';
    if (level === 'MEDIUM') return 'ai-risk.medium-risk';
    return 'ai-risk.low-risk';
  }
}
