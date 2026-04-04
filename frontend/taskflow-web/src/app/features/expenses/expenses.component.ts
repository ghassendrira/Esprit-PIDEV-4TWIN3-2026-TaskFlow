import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { SettingsService } from '../../core/services/settings.service';
import { ExpensesService } from '../../core/services/expenses.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'tf-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, TfCardComponent],
  template: `
    <tf-card>
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 style="margin: 0;">Dépenses</h2>
          <p class="muted" style="margin: 6px 0 0;">Suivez les dépenses par business.</p>
        </div>

        <div class="flex items-center gap-2">
          <ng-container *ngIf="isAdmin()">
            <label class="text-sm muted">Company</label>
            <select
              class="border rounded-lg px-3 py-2 text-sm"
              style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
              [ngModel]="activeTenantId()"
              (ngModelChange)="onTenantChange($event)"
            >
              <option *ngFor="let t of tenants()" [value]="t.id">{{ t.name }}</option>
            </select>
          </ng-container>

          <label class="text-sm muted">Business</label>
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
          <h3 style="margin: 0;">Créer / Modifier</h3>
          <div *ngIf="!canWrite()" class="muted" style="margin-top: 6px;">Lecture seule (Business Owner).</div>
        </div>
        <button (click)="reload()" class="border px-3 py-2 rounded-lg text-sm hover:bg-[var(--tf-surface-2)] transition" style="border-color: var(--tf-border);">Rafraîchir</button>
      </div>

      <form
        *ngIf="canWrite()"
        (ngSubmit)="saveExpense()"
        class="grid"
        style="grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px; align-items: end; margin-top: 10px;"
      >
        <div *ngIf="isAdmin()" style="grid-column: span 3;">
          <label class="text-sm muted">Pour (employé)</label>
          <select
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="selectedEmployeeId"
            name="selectedEmployeeId"
          >
            <option value="">Moi</option>
            <option *ngFor="let u of employees()" [value]="u.id">{{ u.firstName }} {{ u.lastName }} ({{ u.email }})</option>
          </select>
        </div>

        <div style="grid-column: span 4;">
          <label class="text-sm muted">Description</label>
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
          <label class="text-sm muted">Montant</label>
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
          <label class="text-sm muted">Date</label>
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
          <label class="text-sm muted">Statut</label>
          <select
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.status"
            name="status"
          >
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div style="grid-column: span 6;">
          <label class="text-sm muted">Receipt URL (optionnel)</label>
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
            {{ editingId() ? 'Mettre à jour' : 'Créer' }}
          </button>
          <button
            *ngIf="editingId()"
            type="button"
            (click)="cancelEdit()"
            class="border px-4 py-2 rounded-lg text-sm hover:bg-[var(--tf-surface-2)] transition"
            style="border-color: var(--tf-border);"
          >
            Annuler
          </button>
        </div>
      </form>
      <div *ngIf="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</div>
    </tf-card>

    <tf-card style="margin-top: 12px;">
      <div *ngIf="!activeBusinessId()" class="muted">Aucun business trouvé. Créez-en un dans Settings.</div>

      <div *ngIf="activeBusinessId()" class="overflow-auto rounded border" style="border-color: var(--tf-border);">
        <table class="min-w-full text-sm" style="color: var(--tf-on-surface);">
          <thead style="background: var(--tf-surface-2); color: var(--tf-muted);">
            <tr>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Date</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Description</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Montant</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Statut</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--tf-border)]">
            <tr *ngFor="let e of expenses();" class="hover:bg-[var(--tf-surface-2)] transition">
              <td class="px-3 py-2">{{ e.date | date:'dd MMM yyyy' }}</td>
              <td class="px-3 py-2">{{ e.description }}</td>
              <td class="px-3 py-2">{{ e.amount }}</td>
              <td class="px-3 py-2">{{ e.status }}</td>
              <td class="px-3 py-2">
                <div class="flex gap-2">
                  <button
                    *ngIf="canWrite()"
                    (click)="edit(e)"
                    class="border px-2 py-1 rounded hover:bg-[var(--tf-surface-2)] transition"
                    style="border-color: var(--tf-border);"
                  >
                    Modifier
                  </button>
                  <button
                    *ngIf="canWrite()"
                    (click)="remove(e)"
                    class="border px-2 py-1 rounded text-red-600 hover:bg-[var(--tf-surface-2)] transition"
                    style="border-color: var(--tf-border);"
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="activeBusinessId() && expenses().length === 0" class="muted" style="margin-top: 10px;">Aucune dépense.</div>
    </tf-card>
  `
})
export class ExpensesComponent implements OnInit {
  private settings = inject(SettingsService);
  private expensesApi = inject(ExpensesService);
  private auth = inject(AuthService);

  businesses = signal<Array<{ id: string; name: string }>>([]);
  tenants = signal<Array<{ id: string; name: string }>>([]);
  activeTenantId = signal<string>(localStorage.getItem('activeTenantId') || '');
  employees = signal<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  selectedEmployeeId: string = '';
  activeBusinessId = signal<string>('');
  expenses = signal<any[]>([]);
  editingId = signal<string>('');
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
          if (simplified.length && !this.activeTenantId()) {
            this.onTenantChange(simplified[0].id);
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
    this.cancelEdit();
    this.selectedEmployeeId = '';
    this.employees.set([]);
    this.businesses.set([]);
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
    this.cancelEdit();
    this.reload();
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
      this.errorMessage = 'La description doit contenir entre 3 et 255 caractères.';
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      this.errorMessage = 'Le montant doit être supérieur à 0.';
      return;
    }

    if (!date) {
      this.errorMessage = 'La date est obligatoire.';
      return;
    }

    if (receiptUrl && !/^(https?:\/\/|data:image\/).+/i.test(receiptUrl)) {
      this.errorMessage = "L'URL du reçu est invalide.";
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
      payload.createdByUserId = this.selectedEmployeeId;
    }

    const id = this.editingId();
    const tenantId = this.resolveTenantId();
    const obs$ = id ? this.expensesApi.update(id, payload, tenantId) : this.expensesApi.create(payload, tenantId);
    obs$.subscribe({
      next: () => {
        this.cancelEdit();
        this.reload();
      },
      error: (err) => alert(err?.error?.message || 'Erreur Expense'),
    });
  }

  edit(e: any) {
    this.editingId.set(e.id);
    this.form = {
      description: e.description,
      amount: e.amount,
      date: e.date ? String(e.date).slice(0, 10) : '',
      status: e.status,
      receiptUrl: e.receiptUrl,
    };
  }

  cancelEdit() {
    this.editingId.set('');
    this.form = { description: '', amount: 0, date: '', status: 'PENDING', receiptUrl: '' };
  }

  remove(e: any) {
    if (!confirm('Supprimer cette dépense ?')) return;
    const tenantId = this.resolveTenantId();
    this.expensesApi.remove(e.id, tenantId).subscribe({
      next: () => this.reload(),
      error: (err) => alert(err?.error?.message || 'Erreur suppression'),
    });
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }
}

