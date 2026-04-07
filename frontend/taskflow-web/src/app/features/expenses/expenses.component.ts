import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { SettingsService } from '../../core/services/settings.service';
import { ExpensesService } from '../../core/services/expenses.service';
import { AuthService } from '../../core/services/auth.service';
import { BusinessSelectionService } from '../../core/services/business-selection.service';

@Component({
  selector: 'tf-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, TfCardComponent],
  template: `
    <tf-card>
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold">Dépenses</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Suivez les dépenses par business.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <ng-container *ngIf="isAdmin()">
            <div class="flex flex-col gap-1 min-w-[120px]">
              <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company</label>
              <select
                class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                [ngModel]="activeTenantId()"
                (ngModelChange)="onTenantChange($event)"
              >
                <option *ngFor="let t of tenants()" [value]="t.id">{{ t.name }}</option>
              </select>
            </div>
          </ng-container>

          <div class="flex flex-col gap-1 min-w-[120px]">
            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Business</label>
            <select
              class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              [ngModel]="activeBusinessId()"
              (ngModelChange)="onBusinessChange($event)"
            >
              <option *ngFor="let b of businesses()" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>
        </div>
      </div>
    </tf-card>

    <tf-card class="mt-4" *ngIf="activeBusinessId()">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold">Créer / Modifier</h3>
          <div *ngIf="!canWrite()" class="text-sm text-slate-500 dark:text-slate-400 mt-1">Lecture seule (Business Owner).</div>
        </div>
        <button (click)="reload()" class="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium">Rafraîchir</button>
      </div>

      <form
        *ngIf="canWrite()"
        (ngSubmit)="saveExpense()"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
      >
        <div *ngIf="isAdmin()" class="sm:col-span-2">
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Pour (employé)</label>
          <select
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            [(ngModel)]="selectedEmployeeId"
            name="selectedEmployeeId"
          >
            <option value="">Moi</option>
            <option *ngFor="let u of employees()" [value]="u.id">{{ u.firstName }} {{ u.lastName }} ({{ u.email }})</option>
          </select>
        </div>

        <div class="sm:col-span-2 lg:col-span-2">
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
          <input
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
            [(ngModel)]="form.description"
            name="description"
            #description="ngModel"
            required
            minlength="3"
            maxlength="255"
            placeholder="Ex: Fournitures bureau..."
            [class.border-red-500]="(description.touched || submitted) && description.invalid"
          />
          <div *ngIf="(description.touched || submitted) && description.errors?.['required']" class="text-red-500 text-[11px] mt-1">La description est obligatoire.</div>
          <div *ngIf="(description.touched || submitted) && description.errors?.['minlength']" class="text-red-500 text-[11px] mt-1">Minimum 3 caractères.</div>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Catégorie</label>
          <select
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
            [(ngModel)]="form.categoryId"
            name="categoryId"
            #categoryId="ngModel"
            required
            [class.border-red-500]="(categoryId.touched || submitted) && categoryId.invalid"
          >
            <option value="" disabled>Sélectionner une catégorie</option>
            <option *ngFor="let cat of expenseCategories()" [value]="cat.id">{{ cat.name }}</option>
          </select>
          <div *ngIf="(categoryId.touched || submitted) && categoryId.errors?.['required']" class="text-red-500 text-[11px] mt-1">La catégorie est obligatoire.</div>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Montant</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
            [(ngModel)]="form.amount"
            name="amount"
            #amount="ngModel"
            required
            [class.border-red-500]="(amount.touched || submitted) && amount.invalid"
          />
          <div *ngIf="(amount.touched || submitted) && amount.errors?.['required']" class="text-red-500 text-[11px] mt-1">Le montant est obligatoire.</div>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Date</label>
          <input
            type="date"
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
            [(ngModel)]="form.date"
            name="date"
            #date="ngModel"
            required
            [class.border-red-500]="(date.touched || submitted) && date.invalid"
          />
          <div *ngIf="(date.touched || submitted) && date.errors?.['required']" class="text-red-500 text-[11px] mt-1">La date est obligatoire.</div>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Statut</label>
          <select
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            [(ngModel)]="form.status"
            name="status"
          >
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div class="sm:col-span-2 lg:col-span-3">
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Receipt URL (optionnel)</label>
          <input
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            [(ngModel)]="form.receiptUrl"
            name="receiptUrl"
            maxlength="500"
          />
        </div>

        <div class="sm:col-span-2 lg:col-span-1 flex gap-2">
          <button type="submit" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition">
            {{ editingId() ? 'Mettre à jour' : 'Créer' }}
          </button>
          <button
            *ngIf="editingId()"
            type="button"
            (click)="cancelEdit()"
            class="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Annuler
          </button>
        </div>
      </form>
      <div *ngIf="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</div>
    </tf-card>

    <tf-card class="mt-4">
      <div *ngIf="!activeBusinessId()" class="text-slate-500 italic">Aucun business trouvé. Créez-en un dans Settings.</div>

      <div *ngIf="activeBusinessId()" class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Date</th>
              <th class="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Description</th>
              <th class="text-right py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Montant</th>
              <th class="text-center py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Statut</th>
              <th class="text-right py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr *ngFor="let e of expenses();" class="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition">
              <td class="py-3 px-4 text-slate-500 dark:text-slate-400">{{ e.date | date:'dd MMM yyyy' }}</td>
              <td class="py-3 px-4 font-medium">{{ e.description }}</td>
              <td class="py-3 px-4 text-right font-bold">{{ e.amount }} TND</td>
              <td class="py-3 px-4 text-center">
                <span [class]="'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ' + (
                  e.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  e.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                )">
                  {{ e.status }}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    *ngIf="canWrite()"
                    (click)="edit(e)"
                    class="text-blue-600 hover:text-blue-700 p-1"
                    title="Modifier"
                  >
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button
                    *ngIf="canWrite()"
                    (click)="remove(e)"
                    class="text-slate-400 hover:text-red-600 p-1 transition"
                    title="Supprimer"
                  >
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="activeBusinessId() && expenses().length === 0" class="text-slate-500 italic mt-4">Aucune dépense.</div>
    </tf-card>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ExpensesComponent implements OnInit {
  private settings = inject(SettingsService);
  private expensesApi = inject(ExpensesService);
  private auth = inject(AuthService);
  private businessSelection = inject(BusinessSelectionService);

  businesses = signal<Array<{ id: string; name: string; tenantId: string }>>([]);
  submitted = false;
  tenants = signal<Array<{ id: string; name: string }>>([]);
  activeTenantId = signal<string>(localStorage.getItem('activeTenantId') || '');
  employees = signal<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  selectedEmployeeId: string = '';
  activeBusinessId = computed(() => this.businessSelection.selectedBusinessId());
  expenses = signal<any[]>([]);
  expenseCategories = signal<any[]>([]);
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
    categoryId: '',
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
        const simplified = (bs || []).map((b) => ({ id: b.id, name: b.name, tenantId: b.tenantId }));
        this.businesses.set(simplified);
        if (simplified.length) {
          const currentId = this.businessSelection.selectedBusinessId();
          const found = simplified.find(b => b.id === currentId);
          if (!currentId || !found) {
            this.onBusinessChange(simplified[0].id);
          } else {
            this.businessSelection.setSelectedBusiness(found.id, found.tenantId);
            this.reload();
          }
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
    this.businessSelection.clearSelection();

    if (!tenantId) return;

    this.settings.getBusinessesForTenant(tenantId).subscribe({
      next: (bs: any[]) => {
        const simplified = (bs || []).map((b) => ({ id: b.id, name: b.name, tenantId: b.tenantId || tenantId }));
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
    const business = this.businesses().find(b => b.id === id);
    if (business) {
      this.businessSelection.setSelectedBusiness(business.id, business.tenantId);
    }
    this.cancelEdit();
    this.reload();
  }

  reload() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;
    const tenantId = this.resolveTenantId();
    if (this.isAdmin() && !tenantId) return;

    this.expensesApi.getCategories(tenantId).subscribe({
      next: (cats) => this.expenseCategories.set(cats || []),
      error: () => this.expenseCategories.set([]),
    });

    this.expensesApi.listByBusiness(businessId, tenantId).subscribe({
      next: (data) => this.expenses.set(data || []),
      error: () => this.expenses.set([]),
    });
  }

  saveExpense() {
    this.submitted = true;
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

    if (!this.form.categoryId) {
      this.errorMessage = 'La catégorie est obligatoire.';
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
      categoryId: this.form.categoryId,
    };

    if (this.isAdmin() && this.selectedEmployeeId) {
      payload.createdByUserId = this.selectedEmployeeId;
    }

    const id = this.editingId();
    const tenantId = this.resolveTenantId();
    const obs$ = id ? this.expensesApi.update(id, payload, tenantId) : this.expensesApi.create(payload, tenantId);
    obs$.subscribe({
      next: () => {
        this.submitted = false;
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
      categoryId: e.categoryId,
    };
  }

  cancelEdit() {
    this.editingId.set('');
    this.form = { description: '', amount: 0, date: '', status: 'PENDING', receiptUrl: '', categoryId: '' };
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

