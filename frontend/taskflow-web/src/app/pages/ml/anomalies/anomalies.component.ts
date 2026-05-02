import { Component, OnInit, inject, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoicesService } from '../../../core/services/invoices.service';
import { ExpensesService } from '../../../core/services/expenses.service';
import { BusinessSelectionService } from '../../../core/services/business-selection.service';
import { SettingsService } from '../../../core/services/settings.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-anomalies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ml-page p-6 bg-[var(--tf-surface)] min-h-screen text-[var(--tf-text)]">

      <!-- Header -->
      <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-bold mb-2">🚨 Détection d'Anomalies</h2>
          <p class="text-[var(--tf-muted)]">Surveillance IA des transactions suspectes — données en temps réel</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <ng-container *ngIf="companies().length > 0">
            <select [(ngModel)]="selectedCompanyId" (ngModelChange)="onCompanyChange($event)"
                    class="bg-[var(--tf-surface-2)] text-[var(--tf-text)] border border-[var(--tf-border)] rounded-xl px-4 py-2 text-sm outline-none min-w-[180px]">
              <option *ngFor="let c of companies()" [value]="c.id">{{ c.name }}</option>
            </select>
          </ng-container>
          <ng-container *ngIf="businesses().length > 0">
            <select [(ngModel)]="selectedBusinessId" (ngModelChange)="onBusinessChange($event)"
                    class="bg-[var(--tf-surface-2)] text-[var(--tf-text)] border border-[var(--tf-border)] rounded-xl px-4 py-2 text-sm outline-none min-w-[180px]">
              <option *ngFor="let b of businesses()" [value]="b.id">{{ b.name }}</option>
            </select>
          </ng-container>
          <button (click)="loadData()" [disabled]="!selectedBusinessId || loading"
                  class="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--tf-border)] hover:bg-[var(--tf-surface-3)] transition-all disabled:opacity-50">
            <i class="fa-solid fa-rotate text-sm" [class.fa-spin]="loading"></i>
          </button>
        </div>
      </div>

      <!-- Alert HIGH -->
      <div *ngIf="highRiskCount > 0 && !loading"
           class="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 flex items-center gap-3 animate-pulse">
        <i class="fa-solid fa-triangle-exclamation text-2xl"></i>
        <div>
          <strong class="block">⚠️ Attention Requise !</strong>
          <span>{{ highRiskCount }} transaction(s) à risque élevé détectée(s) — vérification urgente nécessaire.</span>
        </div>
      </div>

      <!-- Stats -->
      <div *ngIf="!loading" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-[var(--tf-surface-2)] p-6 rounded-2xl border border-[var(--tf-border)]">
          <span class="text-sm text-[var(--tf-muted)] block mb-1">📊 Total analysé</span>
          <strong class="text-3xl font-bold">{{ totalCount }}</strong>
          <span class="text-xs text-[var(--tf-muted)] block mt-1">{{ invoiceCount }} factures · {{ expenseCount }} dépenses</span>
        </div>
        <div class="bg-red-500/10 p-6 rounded-2xl border border-red-500/20">
          <span class="text-sm text-red-400 block mb-1">🚨 Anomalies HIGH</span>
          <strong class="text-3xl font-bold text-red-400">{{ highRiskCount }}</strong>
          <span class="text-xs text-red-400/60 block mt-1">Doublons détectés</span>
        </div>
        <div class="bg-yellow-500/10 p-6 rounded-2xl border border-yellow-500/20">
          <span class="text-sm text-yellow-400 block mb-1">🟡 Anomalies MEDIUM</span>
          <strong class="text-3xl font-bold text-yellow-400">{{ mediumRiskCount }}</strong>
          <span class="text-xs text-yellow-400/60 block mt-1">Montants aberrants</span>
        </div>
        <div class="bg-green-500/10 p-6 rounded-2xl border border-green-500/20">
          <span class="text-sm text-green-400 block mb-1">✅ Normales</span>
          <strong class="text-3xl font-bold text-green-400">{{ totalCount - anomalyCount }}</strong>
          <span class="text-xs text-green-400/60 block mt-1">{{ totalCount > 0 ? (100 - anomalyRate) : 0 }}% saines</span>
        </div>
      </div>

      <!-- Error -->
      <div *ngIf="error && !loading" class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
        ❌ {{ error }}
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="mt-16 flex flex-col items-center gap-4 text-[var(--tf-muted)]">
        <i class="fa-solid fa-shield-halved text-4xl animate-bounce text-primary-500"></i>
        <span class="font-medium">🤖 Analyse IA en cours — détection des anomalies...</span>
      </div>

      <!-- Table -->
      <div *ngIf="!loading" class="bg-[var(--tf-surface-2)] rounded-2xl border border-[var(--tf-border)] overflow-hidden">
        <div class="p-4 border-b border-[var(--tf-border)] flex justify-between items-center flex-wrap gap-3">
          <h3 class="text-lg font-semibold">Transactions Suspectes</h3>
          <div class="flex gap-2">
            <button (click)="setFilter('all')"
                    class="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    [class.bg-primary-500]="filter==='all'" [class.text-white]="filter==='all'"
                    [class.border-[var(--tf-border)]]="filter!=='all'" [class.text-[var(--tf-muted)]]="filter!=='all'">
              Tous ({{ anomalyCount }})
            </button>
            <button (click)="setFilter('HIGH')"
                    class="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    [class.bg-red-500]="filter==='HIGH'" [class.text-white]="filter==='HIGH'"
                    [class.border-red-500]="filter!=='HIGH'" [class.text-red-400]="filter!=='HIGH'">
              🔴 HIGH ({{ highRiskCount }})
            </button>
            <button (click)="setFilter('MEDIUM')"
                    class="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    [class.bg-yellow-500]="filter==='MEDIUM'" [class.text-black]="filter==='MEDIUM'"
                    [class.border-yellow-500]="filter!=='MEDIUM'" [class.text-yellow-400]="filter!=='MEDIUM'">
              🟡 MEDIUM ({{ mediumRiskCount }})
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[var(--tf-surface-3)] text-[var(--tf-muted)] text-xs uppercase tracking-wider">
                <th class="px-6 py-4 font-semibold">Type</th>
                <th class="px-6 py-4 font-semibold">Référence</th>
                <th class="px-6 py-4 font-semibold">Montant</th>
                <th class="px-6 py-4 font-semibold">Date</th>
                <th class="px-6 py-4 font-semibold">Score IA</th>
                <th class="px-6 py-4 font-semibold">Niveau</th>
                <th class="px-6 py-4 font-semibold">Diagnostic</th>
                <th class="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--tf-border)]">
              <tr *ngFor="let item of filteredAnomalies; let i = index"
                  [ngClass]="item.risk_level === 'HIGH' ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-yellow-500/5 hover:bg-yellow-500/10'"
                  class="transition-colors">
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded text-xs font-bold"
                        [class.bg-indigo-500/20]="item.type==='invoice'" [class.text-indigo-400]="item.type==='invoice'"
                        [class.bg-orange-500/20]="item.type==='expense'" [class.text-orange-400]="item.type==='expense'">
                    {{ item.type === 'invoice' ? '🧾 Facture' : '💸 Dépense' }}
                  </span>
                </td>
                <td class="px-6 py-4 font-mono text-sm font-semibold">{{ item.invoiceNumber }}</td>
                <td class="px-6 py-4 font-bold">{{ item.totalTTC | number:'1.2-2' }} TND</td>
                <td class="px-6 py-4 text-sm text-[var(--tf-muted)]">{{ item.date | date:'dd/MM/yyyy' }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-2 rounded-full bg-[var(--tf-surface-3)]">
                      <div class="h-2 rounded-full transition-all"
                           [style.width]="(item.anomaly_score * 100) + '%'"
                           [class.bg-red-500]="item.risk_level==='HIGH'"
                           [class.bg-yellow-500]="item.risk_level==='MEDIUM'"></div>
                    </div>
                    <span class="text-xs text-[var(--tf-muted)]">{{ (item.anomaly_score * 100) | number:'1.0-0' }}%</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded text-xs font-bold uppercase"
                        [class.bg-red-500]="item.risk_level==='HIGH'" [class.text-white]="item.risk_level==='HIGH'"
                        [class.bg-yellow-500]="item.risk_level==='MEDIUM'" [class.text-black]="item.risk_level==='MEDIUM'">
                    {{ item.risk_level }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-[var(--tf-muted)]">{{ item.message }}</td>
                <td class="px-6 py-4 text-center">
                  <button (click)="signaler(item)"
                          [id]="'flag-btn-' + i"
                          class="px-3 py-1 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 rounded-lg text-xs font-semibold transition-all">
                    🚩 Signaler
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredAnomalies.length === 0">
                <td colspan="8" class="px-6 py-16 text-center text-[var(--tf-muted)]">
                  <i class="fa-solid fa-check-circle text-5xl text-green-500 block mb-3 opacity-60"></i>
                  <p class="font-semibold text-lg">✅ Aucune anomalie détectée</p>
                  <p class="text-sm mt-1">Toutes les transactions analysées sont normales.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- No business -->
      <div *ngIf="!loading && !selectedBusinessId" class="mt-12 text-center text-[var(--tf-muted)]">
        <i class="fa-solid fa-building text-4xl mb-4 block opacity-30"></i>
        <p>Aucun business sélectionné. Configurez un business dans les paramètres.</p>
      </div>
    </div>
  `,
  styles: [`
    .ml-page { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AnomaliesComponent implements OnInit {
  private invoicesSvc = inject(InvoicesService);
  private expensesSvc = inject(ExpensesService);
  private businessSelection = inject(BusinessSelectionService);
  private settings = inject(SettingsService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  businesses = signal<Array<{ id: string; name: string; tenantId: string }>>([]);
  companies  = signal<Array<{ id: string; name: string }>>([]);
  selectedBusinessId = '';
  selectedCompanyId  = '';

  anomalies: any[]         = [];
  filteredAnomalies: any[] = [];
  filter: 'all' | 'HIGH' | 'MEDIUM' = 'all';
  loading = true;
  error   = '';

  totalCount    = 0;
  invoiceCount  = 0;
  expenseCount  = 0;
  anomalyCount  = 0;
  highRiskCount = 0;
  mediumRiskCount = 0;
  anomalyRate   = 0;

  private getTenantId(): string {
    return localStorage.getItem('activeTenantId') || localStorage.getItem('tenantId') || '';
  }

  ngOnInit() {
    this.loading = true;
    this.settings.getAllTenants().subscribe({
      next: (ts: any[]) => {
        const list = (ts || []).map((t: any) => ({ id: t.id, name: t.name || t.companyName || 'Compagnie' }));
        this.companies.set(list);
        if (list.length > 0) {
          const cur = this.getTenantId();
          const found = list.find((t: any) => t.id === cur);
          this.selectedCompanyId = found ? found.id : list[0].id;
          this.loadBusinessesForCompany(this.selectedCompanyId);
        } else {
          this.loadBusinessesDirect();
        }
      },
      error: () => this.loadBusinessesDirect()
    });
  }

  private loadBusinessesDirect() {
    const tenantId = this.getTenantId();
    const obs = tenantId
      ? this.settings.getBusinessesForTenant(tenantId)
      : this.settings.getBusinesses();
    obs.subscribe({
      next: (bs: any[]) => this.processBusinesses(bs, tenantId),
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  onCompanyChange(tenantId: string) {
    this.selectedCompanyId = tenantId;
    this.loadBusinessesForCompany(tenantId);
  }

  private loadBusinessesForCompany(tenantId: string) {
    this.loading = true;
    this.cdr.detectChanges();
    this.settings.getBusinessesForTenant(tenantId).subscribe({
      next: (bs: any[]) => this.processBusinesses(bs, tenantId),
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  private processBusinesses(bs: any[], forcedTenantId?: string) {
    const tenantId = forcedTenantId || this.getTenantId();
    const list = (bs || []).map((b: any) => ({ id: b.id, name: b.name, tenantId: b.tenantId || tenantId }));
    this.businesses.set(list);
    if (list.length > 0) {
      const existing = this.businessSelection.selectedBusinessId();
      const valid = list.find((b: any) => b.id === existing);
      const chosen = valid || list[0];
      this.selectedBusinessId = chosen.id;
      this.businessSelection.setSelectedBusiness(chosen.id, chosen.tenantId);
      this.loadData();
    } else {
      this.selectedBusinessId = '';
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onBusinessChange(id: string) {
    const b = this.businesses().find((x: any) => x.id === id);
    if (b) {
      this.selectedBusinessId = b.id;
      this.businessSelection.setSelectedBusiness(b.id, b.tenantId);
      this.loadData();
    }
  }

  loadData() {
    if (!this.selectedBusinessId) return;
    this.loading = true;
    this.error   = '';
    this.cdr.detectChanges();

    forkJoin({
      invoices: this.invoicesSvc.listByBusiness(this.selectedBusinessId).pipe(catchError(() => of([]))),
      expenses: this.expensesSvc.listByBusiness(this.selectedBusinessId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ invoices, expenses }) => {
        this.zone.run(() => {
          this.runDetection(invoices || [], expenses || []);
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.error = 'Impossible de charger les données. Vérifiez la connexion au backend.';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private runDetection(invoices: any[], expenses: any[]) {
    const result: any[] = [];

    // ── Stats pour Z-score ────────────────────────────────────────────────────
    const amounts = invoices.map((i: any) => Number(i.totalAmount || i.totalTTC || i.amount || 0)).filter(a => a > 0);
    const mean    = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const std     = amounts.length > 1
      ? Math.sqrt(amounts.map(a => Math.pow(a - mean, 2)).reduce((a, b) => a + b, 0) / amounts.length)
      : 0;

    // ── Doublons factures ─────────────────────────────────────────────────────
    const dupIds = new Set<string>();
    for (let i = 0; i < invoices.length; i++) {
      for (let j = i + 1; j < invoices.length; j++) {
        const a = invoices[i]; const b = invoices[j];
        const amtA = Number(a.totalAmount || a.totalTTC || a.amount || 0);
        const amtB = Number(b.totalAmount || b.totalTTC || b.amount || 0);
        const dA   = new Date(a.issueDate || a.createdAt).getTime();
        const dB   = new Date(b.issueDate || b.createdAt).getTime();
        if (isNaN(dA) || isNaN(dB)) continue;
        if (a.clientId === b.clientId && Math.abs(amtA - amtB) < 0.01 && Math.abs(dA - dB) / 86400000 <= 1) {
          dupIds.add(a.id); dupIds.add(b.id);
        }
      }
    }

    invoices.forEach((inv: any) => {
      const amt = Number(inv.totalAmount || inv.totalTTC || inv.amount || 0);
      const z   = std > 0 ? Math.abs((amt - mean) / std) : 0;
      if (dupIds.has(inv.id)) {
        result.push({ id: inv.id, type: 'invoice', invoiceNumber: inv.invoiceNumber || `INV-${inv.id?.substring(0,8)}`,
          totalTTC: amt, date: inv.issueDate || inv.createdAt, anomaly_score: 0.95,
          risk_level: 'HIGH', message: '⚠️ Facture dupliquée — même client, même montant, même date' });
      } else if (amounts.length >= 5 && z > 2.5) {
        result.push({ id: inv.id, type: 'invoice', invoiceNumber: inv.invoiceNumber || `INV-${inv.id?.substring(0,8)}`,
          totalTTC: amt, date: inv.issueDate || inv.createdAt, anomaly_score: Math.min(0.95, 0.5 + z * 0.08),
          risk_level: 'MEDIUM', message: `⚠️ Montant aberrant (${amt.toFixed(0)} TND vs moy. ${mean.toFixed(0)} TND)` });
      }
    });

    // ── Doublons dépenses ─────────────────────────────────────────────────────
    const expDupIds = new Set<string>();
    for (let i = 0; i < expenses.length; i++) {
      for (let j = i + 1; j < expenses.length; j++) {
        const a = expenses[i]; const b = expenses[j];
        const dA = new Date(a.date || a.createdAt).getTime();
        const dB = new Date(b.date || b.createdAt).getTime();
        if (isNaN(dA) || isNaN(dB)) continue;
        const sameUser   = (a.createdBy || a.createdByUserId) === (b.createdBy || b.createdByUserId);
        const sameAmt    = Math.abs(Number(a.amount) - Number(b.amount)) < 0.01;
        const sameCat    = !a.categoryId || a.categoryId === b.categoryId;
        if (sameUser && sameAmt && sameCat && Math.abs(dA - dB) / 86400000 <= 1) {
          expDupIds.add(a.id); expDupIds.add(b.id);
        }
      }
    }
    expenses.forEach((exp: any) => {
      if (expDupIds.has(exp.id)) {
        result.push({ id: exp.id, type: 'expense', invoiceNumber: `EXP-${exp.id?.substring(0,8)}`,
          totalTTC: Number(exp.amount || 0), date: exp.date || exp.createdAt, anomaly_score: 0.90,
          risk_level: 'HIGH', message: '⚠️ Dépense dupliquée — même utilisateur, même montant' });
      }
    });

    result.sort((a, b) => (a.risk_level === 'HIGH' ? -1 : 1) || b.anomaly_score - a.anomaly_score);

    this.anomalies     = result;
    this.totalCount    = invoices.length + expenses.length;
    this.invoiceCount  = invoices.length;
    this.expenseCount  = expenses.length;
    this.anomalyCount  = result.length;
    this.highRiskCount = result.filter(r => r.risk_level === 'HIGH').length;
    this.mediumRiskCount = result.filter(r => r.risk_level === 'MEDIUM').length;
    this.anomalyRate   = this.totalCount > 0 ? Math.round((this.anomalyCount / this.totalCount) * 100) : 0;
    this.applyFilter();
  }

  setFilter(f: 'all' | 'HIGH' | 'MEDIUM') { this.filter = f; this.applyFilter(); }

  private applyFilter() {
    this.filteredAnomalies = this.filter === 'all'
      ? this.anomalies
      : this.anomalies.filter(a => a.risk_level === this.filter);
  }

  signaler(item: any) {
    alert(`🚩 Signalement enregistré pour ${item.invoiceNumber}\n\nUn administrateur va examiner cette transaction.`);
  }
}
