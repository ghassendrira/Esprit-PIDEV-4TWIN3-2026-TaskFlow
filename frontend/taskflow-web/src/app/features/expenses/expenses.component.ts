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

    <!-- STATISTIQUES -->
    <tf-card class="mt-4" *ngIf="activeBusinessId() && expenses().length > 0">
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-bold text-lg">📊 Statistiques du mois</h3>
        <div class="flex items-center gap-2">
          <button (click)="prevMonth()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-500">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <span class="text-sm font-semibold min-w-[120px] text-center">{{ statsMonthLabel() }}</span>
          <button (click)="nextMonth()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-500">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-blue-500 mb-1">Total dépensé</p>
          <p class="text-xl font-black text-blue-600 dark:text-blue-400">{{ statsTotal() | number:'1.2-2' }} <span class="text-xs font-medium">TND</span></p>
          <p class="text-[10px] text-slate-500 mt-1">{{ statsMonthExpenses().length }} dépense(s)</p>
        </div>
        <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-green-500 mb-1">Approuvé</p>
          <p class="text-xl font-black text-green-600 dark:text-green-400">{{ statsApproved() | number:'1.2-2' }} <span class="text-xs font-medium">TND</span></p>
          <p class="text-[10px] text-slate-500 mt-1">{{ statsApprovedCount() }} dépense(s)</p>
        </div>
        <div class="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-yellow-500 mb-1">En attente</p>
          <p class="text-xl font-black text-yellow-600 dark:text-yellow-400">{{ statsPending() | number:'1.2-2' }} <span class="text-xs font-medium">TND</span></p>
          <p class="text-[10px] text-slate-500 mt-1">{{ statsPendingCount() }} dépense(s)</p>
        </div>
        <div class="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-1">Rejeté</p>
          <p class="text-xl font-black text-red-600 dark:text-red-400">{{ statsRejected() | number:'1.2-2' }} <span class="text-xs font-medium">TND</span></p>
          <p class="text-[10px] text-slate-500 mt-1">{{ statsRejectedCount() }} dépense(s)</p>
        </div>
      </div>

      <!-- Répartition par statut -->
      <div class="mb-6">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Répartition par statut</h4>
        <div class="flex h-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <div
            *ngIf="statsApprovedPct() > 0"
            class="bg-green-500 transition-all duration-500 flex items-center justify-center"
            [style.width.%]="statsApprovedPct()"
          >
            <span *ngIf="statsApprovedPct() > 10" class="text-[9px] font-bold text-white">{{ statsApprovedPct() | number:'1.0-0' }}%</span>
          </div>
          <div
            *ngIf="statsPendingPct() > 0"
            class="bg-yellow-500 transition-all duration-500 flex items-center justify-center"
            [style.width.%]="statsPendingPct()"
          >
            <span *ngIf="statsPendingPct() > 10" class="text-[9px] font-bold text-white">{{ statsPendingPct() | number:'1.0-0' }}%</span>
          </div>
          <div
            *ngIf="statsRejectedPct() > 0"
            class="bg-red-500 transition-all duration-500 flex items-center justify-center"
            [style.width.%]="statsRejectedPct()"
          >
            <span *ngIf="statsRejectedPct() > 10" class="text-[9px] font-bold text-white">{{ statsRejectedPct() | number:'1.0-0' }}%</span>
          </div>
        </div>
        <div class="flex gap-4 mt-2">
          <span class="text-[10px] text-slate-500 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Approuvé</span>
          <span class="text-[10px] text-slate-500 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span> En attente</span>
          <span class="text-[10px] text-slate-500 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Rejeté</span>
        </div>
      </div>

      <!-- Dépenses par catégorie -->
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Dépenses par catégorie</h4>
        <div class="space-y-2">
          <div *ngFor="let cat of statsByCategory()" class="flex items-center gap-3">
            <span class="text-xs w-40 truncate text-slate-600 dark:text-slate-300 font-medium">{{ cat.name }}</span>
            <div class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-5 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500 flex items-center px-2"
                [style.width.%]="cat.pct"
                [class]="cat.color"
              >
                <span *ngIf="cat.pct > 12" class="text-[9px] font-bold text-white">{{ cat.total | number:'1.0-0' }} TND</span>
              </div>
            </div>
            <span class="text-xs text-slate-500 w-20 text-right">{{ cat.total | number:'1.2-2' }} TND</span>
          </div>
        </div>
      </div>
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
  statsMonth = signal<number>(new Date().getMonth());
  statsYear = signal<number>(new Date().getFullYear());

  private catColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500',
    'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
  ];

  statsMonthLabel = computed(() => {
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return `${months[this.statsMonth()]} ${this.statsYear()}`;
  });

  statsMonthExpenses = computed(() => {
    const m = this.statsMonth();
    const y = this.statsYear();
    return this.expenses().filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
  });

  statsTotal = computed(() => this.statsMonthExpenses().reduce((s: number, e: any) => s + (e.amount || 0), 0));
  statsApproved = computed(() => this.statsMonthExpenses().filter((e: any) => e.status === 'APPROVED').reduce((s: number, e: any) => s + e.amount, 0));
  statsApprovedCount = computed(() => this.statsMonthExpenses().filter((e: any) => e.status === 'APPROVED').length);
  statsPending = computed(() => this.statsMonthExpenses().filter((e: any) => e.status === 'PENDING').reduce((s: number, e: any) => s + e.amount, 0));
  statsPendingCount = computed(() => this.statsMonthExpenses().filter((e: any) => e.status === 'PENDING').length);
  statsRejected = computed(() => this.statsMonthExpenses().filter((e: any) => e.status === 'REJECTED').reduce((s: number, e: any) => s + e.amount, 0));
  statsRejectedCount = computed(() => this.statsMonthExpenses().filter((e: any) => e.status === 'REJECTED').length);

  statsApprovedPct = computed(() => this.statsTotal() ? (this.statsApproved() / this.statsTotal()) * 100 : 0);
  statsPendingPct = computed(() => this.statsTotal() ? (this.statsPending() / this.statsTotal()) * 100 : 0);
  statsRejectedPct = computed(() => this.statsTotal() ? (this.statsRejected() / this.statsTotal()) * 100 : 0);

  statsByCategory = computed(() => {
    const exps = this.statsMonthExpenses();
    const total = this.statsTotal();
    const map = new Map<string, { name: string; total: number }>();
    for (const e of exps) {
      const name = e.category?.name || 'Sans catégorie';
      const entry = map.get(name) || { name, total: 0 };
      entry.total += e.amount || 0;
      map.set(name, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((c, i) => ({ ...c, pct: total ? (c.total / total) * 100 : 0, color: this.catColors[i % this.catColors.length] }));
  });

  prevMonth() {
    let m = this.statsMonth() - 1;
    let y = this.statsYear();
    if (m < 0) { m = 11; y--; }
    this.statsMonth.set(m);
    this.statsYear.set(y);
  }

  nextMonth() {
    let m = this.statsMonth() + 1;
    let y = this.statsYear();
    if (m > 11) { m = 0; y++; }
    this.statsMonth.set(m);
    this.statsYear.set(y);
  }

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

