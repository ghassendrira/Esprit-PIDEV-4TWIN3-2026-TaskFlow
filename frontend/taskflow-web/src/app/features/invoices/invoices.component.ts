import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { SettingsService } from '../../core/services/settings.service';
import { ClientsService, ClientDto } from '../../core/services/clients.service';
import { InvoicesService } from '../../core/services/invoices.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/t.pipe';
import { AppDialogComponent } from '../../shared/components/app-dialog/app-dialog.component';

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
  selector: 'tf-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, TfCardComponent, TranslatePipe, AppDialogComponent],
  template: `
    <tf-card>
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 style="margin: 0;">{{ 'invoice.title' | t }}</h2>
          <p class="muted" style="margin: 6px 0 0;">{{ 'invoice.subtitle' | t }}</p>
        </div>

        <div class="flex items-center gap-2">
          <ng-container *ngIf="isAdmin()">
            <label class="text-sm muted">{{ 'invoice.company' | t }}</label>
            <select
              class="border rounded-lg px-3 py-2 text-sm"
              style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
              [ngModel]="activeTenantId()"
              (ngModelChange)="onTenantChange($event)"
            >
              <option *ngFor="let t of tenants()" [value]="t.id">{{ t.name }}</option>
            </select>
          </ng-container>

          <label class="text-sm muted">{{ 'invoice.business' | t }}</label>
          <select
            class="border rounded-lg px-3 py-2 text-sm"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [ngModel]="activeBusinessId()"
            (ngModelChange)="onBusinessChange($event)"
          >
            <option *ngFor="let b of businesses()" [value]="b.id">{{ b.name }}</option>
          </select>
        </div>
      </div>
    </tf-card>

    <tf-card style="margin-top: 12px;" *ngIf="activeBusinessId()">
      <div class="flex items-center justify-between" style="gap: 12px;">
        <div>
          <h3 style="margin: 0;">{{ 'invoice.create-update' | t }}</h3>
          <div *ngIf="!canWrite()" class="muted" style="margin-top: 6px;">{{ 'invoice.readonly' | t }}</div>
        </div>
        <button (click)="reload()" class="border px-3 py-2 rounded-lg text-sm hover:bg-[var(--tf-surface-2)] transition" style="border-color: var(--tf-border);">{{ 'invoice.refresh' | t }}</button>
      </div>

      <form
        *ngIf="canWrite()"
        (ngSubmit)="saveInvoice()"
        class="grid"
        style="grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px; align-items: end; margin-top: 10px;"
      >
        <div style="grid-column: span 3;">
          <label class="text-sm muted">Invoice file (PDF/image)</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            class="w-full border rounded-lg px-3 py-2 text-sm"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            (change)="onInvoiceFileSelected($event)"
            [disabled]="extracting()"
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">Invoice number</label>
          <input
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.invoiceNumber"
            name="invoiceNumber"
            maxlength="64"
          />
        </div>

        <div *ngIf="isAdmin()" style="grid-column: span 3;">
          <label class="text-sm muted">{{ 'invoice.for-employee' | t }}</label>
          <select
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="selectedEmployeeId"
            name="selectedEmployeeId"
          >
            <option value="">{{ 'common.me' | t }}</option>
            <option *ngFor="let u of employees()" [value]="u.id">{{ u.firstName }} {{ u.lastName }} ({{ u.email }})</option>
          </select>
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">{{ 'invoice.client' | t }}</label>
          <select
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.clientId"
            name="clientId"
            (ngModelChange)="onClientChange($event)"
            required
          >
            <option *ngFor="let c of clients()" [value]="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">{{ 'invoice.status' | t }}</label>
          <select
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.status"
            name="status"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">{{ 'invoice.issue-date' | t }}</label>
          <input
            type="date"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.issueDate"
            name="issueDate"
            (ngModelChange)="onInvoiceFieldsChange()"
            required
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">{{ 'invoice.due-date' | t }}</label>
          <input
            type="date"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.dueDate"
            name="dueDate"
            [min]="form.issueDate"
            (ngModelChange)="onInvoiceFieldsChange()"
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">{{ 'invoice.total' | t }}</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.totalAmount"
            name="totalAmount"
            (ngModelChange)="onInvoiceFieldsChange()"
            required
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">{{ 'invoice.tax' | t }}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.taxAmount"
            name="taxAmount"
            (ngModelChange)="onInvoiceFieldsChange()"
          />
        </div>

        <div style="grid-column: span 4;">
          <label class="text-sm muted">{{ 'invoice.notes' | t }}</label>
          <input
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.notes"
            name="notes"
            maxlength="500"
          />
        </div>

        <div style="grid-column: span 2; display: flex; gap: 8px;">
          <button type="submit" class="bg-[var(--tf-primary)] text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold hover:brightness-95 transition">
            {{ editingId() ? ('clients.update' | t) : ('clients.create' | t) }}
          </button>
          <button
            *ngIf="editingId()"
            type="button"
            (click)="cancelEdit()"
            class="border px-4 py-2 rounded-lg text-sm hover:bg-[var(--tf-surface-2)] transition"
            style="border-color: var(--tf-border);"
          >
            {{ 'clients.cancel' | t }}
          </button>
        </div>
      </form>

      <div class="grid gap-3" style="grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 14px;">
        <div class="rounded-lg border p-3" style="border-color: var(--tf-border); background: var(--tf-surface-2);">
          <div class="text-xs font-semibold uppercase tracking-[0.08em] muted">Automatic status</div>
          <div class="mt-2 text-lg font-bold">{{ invoiceStatusLabel() }}</div>
          <p class="muted" style="margin-top: 6px; font-size: 12px;">{{ invoiceStatusHint() }}</p>
        </div>

        <div class="rounded-lg border p-3" style="border-color: var(--tf-border); background: var(--tf-surface-2);">
          <div class="text-xs font-semibold uppercase tracking-[0.08em] muted">AI risk</div>
          <ng-container *ngIf="riskPrediction() as currentPrediction; else noRisk">
            <div class="mt-2 text-lg font-bold">{{ currentPrediction.label === 'late' ? 'High risk' : 'Low risk' }}</div>
            <div class="mt-2 grid gap-2 text-sm">
              <div class="flex items-center justify-between"><span class="muted">Late risk</span><strong>{{ (currentPrediction.riskProbability * 100) | number:'1.0-1' }}%</strong></div>
              <div class="flex items-center justify-between"><span class="muted">Risk level</span><strong>{{ currentPrediction.riskLevel }}</strong></div>
              <div class="flex items-center justify-between"><span class="muted">Confidence</span><strong>{{ (currentPrediction.confidence * 100) | number:'1.0-1' }}%</strong></div>
            </div>
          </ng-container>
          <ng-template #noRisk>
            <p class="muted" style="margin-top: 8px; font-size: 12px;">Select a client to compute the AI risk from its invoice history.</p>
          </ng-template>
        </div>
      </div>

      <div *ngIf="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</div>
    </tf-card>

    <tf-card style="margin-top: 12px;">
      <div *ngIf="!activeBusinessId()" class="muted">{{ 'invoice.none' | t }}</div>

      <div *ngIf="activeBusinessId()" class="overflow-auto rounded border" style="border-color: var(--tf-border); margin-top: 0;">
        <table class="min-w-full text-sm" style="color: var(--tf-on-surface);">
          <thead style="background: var(--tf-surface-2); color: var(--tf-muted);">
            <tr>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'invoice.number' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'invoice.status' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'invoice.issue' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'invoice.due' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'invoice.total' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'invoice.tax' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'invoice.actions' | t }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--tf-border)]">
            <tr *ngFor="let inv of invoices();" class="hover:bg-[var(--tf-surface-2)] transition">
              <td class="px-3 py-2 font-['DM_Mono']">{{ inv.invoiceNumber }}</td>
              <td class="px-3 py-2">{{ inv.status }}</td>
              <td class="px-3 py-2">{{ inv.issueDate | date:'dd MMM yyyy' }}</td>
              <td class="px-3 py-2">{{ inv.dueDate | date:'dd MMM yyyy' }}</td>
              <td class="px-3 py-2">{{ inv.totalAmount }}</td>
              <td class="px-3 py-2">{{ inv.taxAmount }}</td>
              <td class="px-3 py-2">
                <div class="flex gap-2">
                  <button
                    type="button"
                    (click)="edit(inv)"
                    class="border px-2 py-1 rounded hover:bg-[var(--tf-surface-2)] transition"
                    style="border-color: var(--tf-border);"
                  >
                    {{ 'clients.edit' | t }}
                  </button>
                  <button
                    type="button"
                    (click)="remove(inv)"
                    class="border px-2 py-1 rounded hover:bg-[var(--tf-surface-2)] transition"
                    style="border-color: var(--tf-border);"
                  >
                    {{ 'employees.delete' | t }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="activeBusinessId() && invoices().length === 0" class="muted" style="margin-top: 10px;">{{ 'invoice.none' | t }}</div>
    </tf-card>

    <tf-app-dialog
      [open]="dialogOpen()"
      [title]="dialogTitle()"
      [message]="dialogMessage()"
      [mode]="dialogMode()"
      [confirmLabel]="dialogConfirmLabel()"
      cancelLabel="Cancel"
      [danger]="dialogDanger()"
      (confirm)="handleDialogConfirm()"
      (cancel)="closeDialog()"
    />
  `
})
export class InvoicesComponent implements OnInit {
  private api = inject(ApiService);
  private settings = inject(SettingsService);
  private clientsApi = inject(ClientsService);
  private invoicesApi = inject(InvoicesService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  businesses = signal<Array<{ id: string; name: string }>>([]);
  tenants = signal<Array<{ id: string; name: string }>>([]);
  activeTenantId = signal<string>(localStorage.getItem('activeTenantId') || '');
  employees = signal<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  selectedEmployeeId: string = '';
  activeBusinessId = signal<string>('');
  clients = signal<ClientDto[]>([]);
  clientSummary = signal<ClientSummary | null>(null);
  aiModel = signal<DelayModelSnapshot | null>(null);
  riskPrediction = signal<DelayPrediction | null>(null);

  invoices = signal<any[]>([]);
  editingId = signal<string>('');
  dialogOpen = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  dialogMode = signal<'alert' | 'confirm' | 'prompt'>('alert');
  dialogConfirmLabel = signal('OK');
  dialogDanger = signal(false);
  pendingDeleteInvoice = signal<any | null>(null);
  errorMessage: string | null = null;

  isBusinessOwner = computed(() => {
    const roles = this.auth.roles() as any[];
    return roles.includes('BUSINESS_OWNER') || roles.includes('OWNER');
  });
  canWrite = computed(() => !this.isBusinessOwner());

  isAdmin = computed(() => {
    const roles = this.auth.roles() as any[];
    return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
  });

  form: any = {
    clientId: '',
    invoiceNumber: '',
    status: 'DRAFT',
    issueDate: '',
    dueDate: '',
    totalAmount: 0,
    taxAmount: 0,
    notes: '',
  };

  extracting = signal(false);

  ngOnInit(): void {
    this.api.get<DelayModelSnapshot>('/ai/invoice-delay/model').subscribe({
      next: (snapshot) => this.aiModel.set(snapshot),
      error: () => this.aiModel.set(null),
    });

    if (this.isAdmin()) {
      this.settings.getAllTenants().subscribe({
        next: (ts: any[]) => {
          const simplified = (ts || []).map((t) => ({ id: t.id, name: t.name || t.companyName || t.title || t.id }));
          this.tenants.set(simplified);
          const storedTenantId = this.activeTenantId();
          const nextTenantId = simplified.some((tenant) => tenant.id === storedTenantId)
            ? storedTenantId
            : simplified[0]?.id || '';
          if (nextTenantId) {
            this.onTenantChange(nextTenantId);
          }
        },
        error: () => this.tenants.set([]),
      });
      return;
    }

    this.settings.getBusinesses().subscribe({
      next: (bs: any[]) => {
        const simplified = (bs || []).map((b) => ({ id: b.id, name: b.name }));
        this.businesses.set(simplified);
        if (simplified.length && !this.activeBusinessId()) {
          this.onBusinessChange(simplified[0].id);
        }
      },
      error: () => this.businesses.set([]),
    });
  }

  onTenantChange(tenantId: string) {
    this.activeTenantId.set(tenantId);
    if (tenantId) {
      localStorage.setItem('activeTenantId', tenantId);
    }
    this.editingId.set('');
    this.selectedEmployeeId = '';
    this.employees.set([]);
    this.businesses.set([]);
    this.clients.set([]);
    this.clientSummary.set(null);
    this.riskPrediction.set(null);
    this.activeBusinessId.set('');

    if (!tenantId) return;

    this.settings.getBusinessesForTenant(tenantId).subscribe({
      next: (bs: any[]) => {
        const simplified = (bs || []).map((b) => ({ id: b.id, name: b.name }));
        this.businesses.set(simplified);
        if (simplified.length) this.onBusinessChange(simplified[0].id);
      },
      error: () => this.businesses.set([]),
    });

    this.auth.getEmployeesForTenant(tenantId).subscribe({
      next: (list: any[]) => this.employees.set(list || []),
      error: () => this.employees.set([]),
    });
  }

  private resolveTenantId(): string {
    return this.activeTenantId() || localStorage.getItem('activeTenantId') || '';
  }

  onBusinessChange(id: string) {
    this.activeBusinessId.set(id);
    this.editingId.set('');
    this.form = { clientId: '', invoiceNumber: '', status: 'DRAFT', issueDate: '', dueDate: '', totalAmount: 0, taxAmount: 0, notes: '' };
    this.clientSummary.set(null);
    this.riskPrediction.set(null);
    this.reloadClients();
    this.reload();
  }

  edit(inv: any) {
    this.editingId.set(inv.id);
    this.form = {
      clientId: inv.clientId || '',
      invoiceNumber: inv.invoiceNumber || '',
      status: inv.status || 'DRAFT',
      issueDate: inv.issueDate ? this.toDateInputValue(new Date(inv.issueDate)) : '',
      dueDate: inv.dueDate ? this.toDateInputValue(new Date(inv.dueDate)) : '',
      totalAmount: inv.totalAmount ?? 0,
      taxAmount: inv.taxAmount ?? 0,
      notes: inv.notes || '',
    };
    this.selectedEmployeeId = inv.createdByUserId || '';
    this.refreshInvoiceRisk();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onInvoiceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    if (input) input.value = '';
    void this.extractFromInvoice(file);
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toDateInputValue(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private async extractFromInvoice(file: File): Promise<void> {
    this.extracting.set(true);
    this.errorMessage = null;

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
      .subscribe({
        next: (result) => {
          const issue = this.parseDate(result?.issueDate || '');
          const due = this.parseDate(result?.dueDate || '');

          this.form = {
            ...this.form,
            invoiceNumber: (result?.invoiceNumber || this.form.invoiceNumber || '').slice(0, 64),
            issueDate: issue ? this.toDateInputValue(issue) : this.form.issueDate,
            dueDate: due ? this.toDateInputValue(due) : this.form.dueDate,
            totalAmount: typeof result?.totalAmount === 'number' ? result.totalAmount : this.form.totalAmount,
            taxAmount: typeof result?.taxAmount === 'number' ? result.taxAmount : this.form.taxAmount,
          };
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'OCR failed.';
          this.errorMessage = String(msg);
        },
      })
      .add(() => this.extracting.set(false));
  }

  reloadClients() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;
    const tenantId = this.resolveTenantId();
    if (this.isAdmin() && !tenantId) return;
    this.clientsApi.listByBusiness(businessId, tenantId).subscribe({
      next: (data) => {
        this.clients.set(data || []);
        if (!this.form.clientId && data?.length) {
          this.onClientChange(data[0].id);
        } else {
          this.refreshInvoiceRisk();
        }
      },
      error: () => this.clients.set([]),
    });
  }

  reload() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;
    const tenantId = this.resolveTenantId();
    if (this.isAdmin() && !tenantId) return;
    this.invoicesApi.listByBusiness(businessId, tenantId).subscribe({
      next: (data) => {
        this.invoices.set(data || []);
        this.refreshInvoiceRisk();
      },
      error: () => this.invoices.set([]),
    });
  }

  onClientChange(clientId: string) {
    this.form.clientId = clientId;
    this.refreshInvoiceRisk();
  }

  onInvoiceFieldsChange() {
    this.syncAutoStatus();
    this.refreshInvoiceRisk();
  }

  invoiceStatusLabel(): string {
    return this.syncAutoStatus();
  }

  invoiceStatusHint(): string {
    const issueDate = this.form.issueDate ? new Date(this.form.issueDate) : null;
    const dueDate = this.form.dueDate ? new Date(this.form.dueDate) : null;

    if (!issueDate) {
      return 'Choose an issue date to determine whether the invoice is unpaid or overdue.';
    }

    if (!dueDate) {
      return 'Without a due date, the invoice stays as a draft until you define the payment term.';
    }

    const today = this.startOfToday();
    return dueDate.getTime() < today.getTime()
      ? 'The due date is in the past, so the invoice is considered overdue if no payment exists.'
      : 'The due date is still in the future, so the invoice is unpaid but not overdue yet.';
  }

  private refreshInvoiceRisk(): void {
    const clientId = this.form.clientId;
    if (!clientId) {
      this.clientSummary.set(null);
      this.riskPrediction.set(null);
      return;
    }

    const clientInvoices = this.invoices().filter((invoice) => invoice.clientId === clientId);
    if (!clientInvoices.length) {
      this.clientSummary.set(null);
      this.riskPrediction.set(null);
      return;
    }

    const summary = this.computeClientSummary(clientInvoices);
    this.clientSummary.set(summary);

    const issueDate = this.form.issueDate ? new Date(this.form.issueDate) : null;
    const dueDate = this.form.dueDate ? new Date(this.form.dueDate) : null;
    const dueDays = issueDate && dueDate
      ? Math.max(0, Math.round((dueDate.getTime() - issueDate.getTime()) / 86400000))
      : summary.latestDueDays;

    const payload = {
      businessId: this.activeBusinessId() || undefined,
      clientId: clientId || undefined,
      amount: Number(this.form.totalAmount) || summary.latestAmount,
      dueDays,
      clientLateRatio: summary.lateRatio,
      previousLateCount: summary.latePaidInvoices,
      openInvoiceCount: summary.openInvoiceCount,
      overdueInvoiceCount: summary.overdueInvoiceCount,
    };

    this.api.post<DelayPrediction>('/ai/invoice-delay/predict', payload).subscribe({
      next: (prediction) => this.riskPrediction.set(prediction),
      error: () => this.riskPrediction.set(null),
    });
  }

  private computeClientSummary(clientInvoices: any[]): ClientSummary {
    const sorted = [...clientInvoices].sort((left, right) => new Date(right.issueDate).getTime() - new Date(left.issueDate).getTime());
    const paidInvoices = clientInvoices.filter((invoice) => (invoice.payments?.length ?? 0) > 0);
    const latePaidInvoices = paidInvoices.filter((invoice) => {
      const paymentDate = invoice.payments?.[0]?.paymentDate;
      return paymentDate ? new Date(paymentDate).getTime() > new Date(invoice.dueDate).getTime() : false;
    });
    const openInvoices = clientInvoices.filter((invoice) => (invoice.payments?.length ?? 0) === 0 && invoice.status !== 'CANCELED');
    const openInvoiceCount = openInvoices.length;
    const overdueInvoiceCount = clientInvoices.filter((invoice) => {
      const paymentMissing = (invoice.payments?.length ?? 0) === 0;
      return invoice.status === 'OVERDUE' || (paymentMissing && new Date(invoice.dueDate).getTime() < this.startOfToday().getTime());
    }).length;
    const lateRatio = paidInvoices.length ? latePaidInvoices.length / paidInvoices.length : 0;
    // latestAmount: montant de la facture non payée la plus récente, sinon 0
    const latestOpen = openInvoices.length > 0 ? openInvoices[0] : null;
    const latestAmount = Number(latestOpen?.totalAmount ?? 0);
    const latestDueDays = latestOpen
      ? Math.max(0, Math.round((new Date(latestOpen.dueDate).getTime() - new Date(latestOpen.issueDate).getTime()) / 86400000))
      : 30;

    return {
      totalInvoices: clientInvoices.length,
      paidInvoices: paidInvoices.length,
      latePaidInvoices: latePaidInvoices.length,
      lateRatio,
      openInvoiceCount,
      overdueInvoiceCount,
      latestAmount,
      latestDueDays,
    };
  }

  private syncAutoStatus(): string {
    const issueDate = this.form.issueDate ? new Date(this.form.issueDate) : null;
    const dueDate = this.form.dueDate ? new Date(this.form.dueDate) : null;

    if (!issueDate) {
      if (!this.editingId()) {
        this.form.status = 'DRAFT';
      }
      return 'DRAFT';
    }

    const computed = dueDate && dueDate.getTime() < this.startOfToday().getTime() ? 'OVERDUE' : 'SENT';
    if (!this.editingId()) {
      this.form.status = computed;
    }

    return computed;
  }

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  saveInvoice() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;

    const clientId = String(this.form.clientId || '').trim();
    const invoiceNumber = String(this.form.invoiceNumber || '').trim();
    const issueDate = String(this.form.issueDate || '').trim();
    const dueDate = String(this.form.dueDate || '').trim();
    const totalAmount = Number(this.form.totalAmount ?? 0);
    const taxAmount = Number(this.form.taxAmount ?? 0);
    const notes = String(this.form.notes || '').trim();

    if (!clientId) {
      this.errorMessage = 'Le client est obligatoire.';
      return;
    }

    if (!issueDate) {
      this.errorMessage = 'La date d\'émission est obligatoire.';
      return;
    }

    if (dueDate && new Date(dueDate).getTime() < new Date(issueDate).getTime()) {
      this.errorMessage = 'La date d\'échéance doit être postérieure à la date d\'émission.';
      return;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      this.errorMessage = 'Le total doit être supérieur à 0.';
      return;
    }

    if (!Number.isFinite(taxAmount) || taxAmount < 0) {
      this.errorMessage = 'La taxe doit être positive.';
      return;
    }

    if (notes.length > 500) {
      this.errorMessage = 'Les notes sont trop longues.';
      return;
    }

    this.errorMessage = null;
    const computedStatus = this.syncAutoStatus();
    const id = this.editingId();

    const payload: any = {
      businessId,
      clientId,
      invoiceNumber: invoiceNumber || undefined,
      status: id ? this.form.status : computedStatus,
      issueDate: new Date(issueDate).toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      totalAmount,
      taxAmount,
      notes,
    };

    if (this.isAdmin() && this.selectedEmployeeId) {
      payload.createdByUserId = this.selectedEmployeeId;
    }

    const tenantId = this.resolveTenantId();
    const obs$ = id ? this.invoicesApi.update(id, payload, tenantId) : this.invoicesApi.create(payload, tenantId);
    obs$.subscribe({
      next: () => {
        queueMicrotask(() => {
          this.cancelEdit();
          this.reload();
        });
      },
      error: (err) => this.openAlert('Invoice error', err?.error?.message || this.language.translate('invoice.error')),
    });
  }

  cancelEdit() {
    this.editingId.set('');
    this.form = { clientId: this.form.clientId || '', status: 'DRAFT', issueDate: '', dueDate: '', totalAmount: 0, taxAmount: 0, notes: '' };
    this.clientSummary.set(null);
    this.riskPrediction.set(null);
  }

  remove(inv: any) {
    this.pendingDeleteInvoice.set(inv);
    this.dialogTitle.set('Delete invoice');
    this.dialogMessage.set(this.language.translate('invoice.delete-confirm'));
    this.dialogMode.set('confirm');
    this.dialogConfirmLabel.set('Delete');
    this.dialogDanger.set(true);
    this.dialogOpen.set(true);
  }

  handleDialogConfirm() {
    if (this.dialogMode() === 'alert') {
      this.closeDialog();
      return;
    }

    const inv = this.pendingDeleteInvoice();
    if (!inv) {
      this.closeDialog();
      return;
    }
    this.closeDialog();
    const tenantId = this.resolveTenantId();
    this.invoicesApi.remove(inv.id, tenantId).subscribe({
      next: () => this.reload(),
      error: (err) => this.openAlert('Delete invoice', err?.error?.message || this.language.translate('invoice.delete-error')),
    });
  }

  closeDialog() {
    this.dialogOpen.set(false);
    this.dialogDanger.set(false);
    this.pendingDeleteInvoice.set(null);
  }

  private openAlert(title: string, message: string) {
    this.dialogTitle.set(title);
    this.dialogMessage.set(message);
    this.dialogMode.set('alert');
    this.dialogConfirmLabel.set('OK');
    this.dialogDanger.set(false);
    this.dialogOpen.set(true);
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }
}

