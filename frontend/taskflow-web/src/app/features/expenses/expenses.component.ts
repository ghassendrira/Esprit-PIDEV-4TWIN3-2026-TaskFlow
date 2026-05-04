import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { SettingsService } from '../../core/services/settings.service';
import { ExpensesService } from '../../core/services/expenses.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/t.pipe';
import { AppDialogComponent } from '../../shared/components/app-dialog/app-dialog.component';

@Component({
  selector: 'tf-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, TfCardComponent, TranslatePipe, AppDialogComponent],
  template: `
    <tf-card>
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 style="margin: 0;">{{ 'expenses.title' | t }}</h2>
          <p class="muted" style="margin: 6px 0 0;">{{ 'expenses.subtitle' | t }}</p>
        </div>

        <div class="flex items-center gap-2">
          <ng-container *ngIf="isAdmin()">
            <label class="text-sm muted">{{ 'settings.title' | t }}</label>
            <select
              class="border rounded-lg px-3 py-2 text-sm"
              style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
              [ngModel]="activeTenantId()"
              (ngModelChange)="onTenantChange($event)"
            >
              <option *ngFor="let t of tenants()" [value]="t.id">{{ t.name }}</option>
            </select>
          </ng-container>

          <label class="text-sm muted">{{ 'expenses.business' | t }}</label>
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
          <h3 style="margin: 0;">{{ 'expenses.create-update' | t }}</h3>
          <div *ngIf="!canWrite()" class="muted" style="margin-top: 6px;">{{ 'expenses.readonly' | t }}</div>
        </div>
        <button (click)="reload()" class="border px-3 py-2 rounded-lg text-sm hover:bg-[var(--tf-surface-2)] transition" style="border-color: var(--tf-border);">{{ 'clients.refresh' | t }}</button>
      </div>

      <form
        *ngIf="canWrite()"
        (ngSubmit)="saveExpense()"
        class="grid"
        style="grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px; align-items: end; margin-top: 10px;"
      >
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

        <div style="grid-column: span 4;">
          <label class="text-sm muted">{{ 'expenses.description' | t }}</label>
          <input
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.description"
            name="description"
            required
            minlength="3"
            maxlength="255"
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">{{ 'expenses.amount' | t }}</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.amount"
            name="amount"
            required
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">{{ 'expenses.date' | t }}</label>
          <input
            type="date"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.date"
            name="date"
            required
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">{{ 'expenses.status' | t }}</label>
          <select
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.status"
            name="status"
          >
            <option value="PENDING">{{ 'expenses.status.pending' | t }}</option>
            <option value="APPROVED">{{ 'expenses.status.approved' | t }}</option>
            <option value="REJECTED">{{ 'expenses.status.rejected' | t }}</option>
          </select>
        </div>

        <div style="grid-column: span 6;">
          <label class="text-sm muted">{{ 'expenses.receipt' | t }}</label>
          <input
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.receiptUrl"
            name="receiptUrl"
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
      <div *ngIf="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</div>
    </tf-card>

    <tf-card style="margin-top: 12px;">
      <div *ngIf="!activeBusinessId()" class="muted">{{ 'expenses.no-business' | t }}</div>

      <div *ngIf="activeBusinessId()" class="overflow-auto rounded border" style="border-color: var(--tf-border);">
        <table class="min-w-full text-sm" style="color: var(--tf-on-surface);">
          <thead style="background: var(--tf-surface-2); color: var(--tf-muted);">
            <tr>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'expenses.date' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'expenses.description' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'expenses.amount' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'expenses.status' | t }}</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">{{ 'employees.actions' | t }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--tf-border)]">
            <tr *ngFor="let e of expenses();" class="hover:bg-[var(--tf-surface-2)] transition">
              <td class="px-3 py-2">{{ e.date | date:'dd MMM yyyy' }}</td>
              <td class="px-3 py-2">{{ e.description }}</td>
              <td class="px-3 py-2">{{ e.amount }}</td>
              <td class="px-3 py-2">{{ 'expenses.status.' + e.status.toLowerCase() | t }}</td>
              <td class="px-3 py-2">
                <div class="flex gap-2">
                  <button
                    type="button"
                    (click)="edit(e)"
                    class="border px-2 py-1 rounded hover:bg-[var(--tf-surface-2)] transition"
                    style="border-color: var(--tf-border);"
                  >
                    {{ 'clients.edit' | t }}
                  </button>
                  <button
                    type="button"
                    (click)="remove(e)"
                    class="border px-2 py-1 rounded text-red-600 hover:bg-[var(--tf-surface-2)] transition"
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

      <div *ngIf="activeBusinessId() && expenses().length === 0" class="muted" style="margin-top: 10px;">{{ 'expenses.none' | t }}</div>
    </tf-card>

    <tf-app-dialog
      [open]="dialogOpen()"
      [title]="dialogTitle()"
      [message]="dialogMessage()"
      [mode]="dialogMode()"
      [confirmLabel]="dialogConfirmLabel()"
      [cancelLabel]="'common.cancel' | t"
      [danger]="dialogDanger()"
      (confirm)="handleDialogConfirm()"
      (cancel)="closeDialog()"
    />
  `
})
export class ExpensesComponent implements OnInit {
  private settings = inject(SettingsService);
  private expensesApi = inject(ExpensesService);
  private auth = inject(AuthService);
  private lang = inject(LanguageService);

  businesses = signal<Array<{ id: string; name: string }>>([]);
  tenants = signal<Array<{ id: string; name: string }>>([]);
  activeTenantId = signal<string>(localStorage.getItem('activeTenantId') || '');
  employees = signal<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  selectedEmployeeId: string = '';
  activeBusinessId = signal<string>('');
  expenses = signal<any[]>([]);
  editingId = signal<string>('');
  dialogOpen = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  dialogMode = signal<'alert' | 'confirm' | 'prompt'>('alert');
  dialogConfirmLabel = signal(this.lang.translate('common.ok'));
  dialogDanger = signal(false);
  pendingDeleteExpense = signal<any | null>(null);
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
    description: '',
    amount: 0,
    date: '',
    status: 'PENDING',
    receiptUrl: '',
  };

  ngOnInit(): void {
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
    // Avoid ExpressionChangedAfterItHasBeenCheckedError:
    // ngModelChange can fire during change detection, so defer form resets.
    queueMicrotask(() => {
      this.cancelEdit();
      this.selectedEmployeeId = '';
      this.employees.set([]);
      this.businesses.set([]);
      this.activeBusinessId.set('');
    });

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
    queueMicrotask(() => {
      this.cancelEdit();
      this.reload();
    });
  }

  private toDateInputValue(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  edit(e: any) {
    this.editingId.set(e.id);
    this.form = {
      description: e.description || '',
      amount: e.amount ?? 0,
      date: e.date ? this.toDateInputValue(new Date(e.date)) : '',
      status: e.status || 'PENDING',
      receiptUrl: e.receiptUrl || '',
    };
    this.selectedEmployeeId = e.createdBy || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reload() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;
    const tenantId = this.resolveTenantId();
    if (this.isAdmin() && !tenantId) return;
    this.expensesApi.listByBusiness(businessId, tenantId).subscribe({
      next: (data) => this.expenses.set(data || []),
      error: () => this.expenses.set([]),
    });
  }

  saveExpense() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;

    const description = String(this.form.description || '').trim();
    const amount = Number(this.form.amount ?? 0);
    const date = String(this.form.date || '').trim();
    const receiptUrl = String(this.form.receiptUrl || '').trim();

    if (description.length < 3 || description.length > 255) {
      this.errorMessage = this.lang.translate('expenses.validation.description-length');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      this.errorMessage = this.lang.translate('expenses.validation.amount-positive');
      return;
    }

    if (!date) {
      this.errorMessage = this.lang.translate('expenses.validation.date-required');
      return;
    }

    if (receiptUrl && !/^(https?:\/\/|data:image\/).+/i.test(receiptUrl)) {
      this.errorMessage = this.lang.translate('expenses.validation.receipt-invalid');
      return;
    }

    this.errorMessage = null;

    const payload: any = {
      businessId,
      description,
      amount,
      date: new Date(date).toISOString(),
      status: this.form.status,
      receiptUrl,
    };

    if (this.isAdmin() && this.selectedEmployeeId) {
      payload.createdBy = this.selectedEmployeeId;
    } else {
      // Backend requires createdBy; default to "me" when not acting as admin for another employee.
      payload.createdBy = this.auth.user()?.id;
    }

    const id = this.editingId();
    const tenantId = this.resolveTenantId();
    const obs$ = id ? this.expensesApi.update(id, payload, tenantId) : this.expensesApi.create(payload, tenantId);
    obs$.subscribe({
      next: () => {
        queueMicrotask(() => {
          this.cancelEdit();
          this.reload();
        });
      },
      error: (err) => this.openAlert(this.lang.translate('expenses.error'), err?.error?.message || this.lang.translate('expenses.error')),
    });
  }

  cancelEdit() {
    this.editingId.set('');
    this.form = { description: '', amount: 0, date: '', status: 'PENDING', receiptUrl: '' };
  }

  remove(e: any) {
    this.pendingDeleteExpense.set(e);
    this.dialogTitle.set(this.lang.translate('common.delete'));
    this.dialogMessage.set(this.lang.translate('expenses.delete-confirm'));
    this.dialogMode.set('confirm');
    this.dialogConfirmLabel.set(this.lang.translate('common.delete'));
    this.dialogDanger.set(true);
    this.dialogOpen.set(true);
  }

  handleDialogConfirm() {
    if (this.dialogMode() === 'alert') {
      this.closeDialog();
      return;
    }

    const e = this.pendingDeleteExpense();
    if (!e) {
      this.closeDialog();
      return;
    }
    this.closeDialog();
    const tenantId = this.resolveTenantId();
    this.expensesApi.remove(e.id, tenantId).subscribe({
      next: () => this.reload(),
      error: (err) => this.openAlert(this.lang.translate('expenses.delete-error'), err?.error?.message || this.lang.translate('expenses.delete-error')),
    });
  }

  closeDialog() {
    this.dialogOpen.set(false);
    this.dialogDanger.set(false);
    this.pendingDeleteExpense.set(null);
  }

  private openAlert(title: string, message: string) {
    this.dialogTitle.set(title);
    this.dialogMessage.set(message);
    this.dialogMode.set('alert');
    this.dialogConfirmLabel.set(this.lang.translate('common.ok'));
    this.dialogDanger.set(false);
    this.dialogOpen.set(true);
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }
}

