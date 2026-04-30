import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MlService } from '../../../core/services/ml.service';
import { BusinessSelectionService } from '../../../core/services/business-selection.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-risk',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ml-page p-6 bg-[var(--tf-surface)] min-h-screen text-[var(--tf-text)]">
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-bold mb-1">⚠️ Risque de Paiement</h2>
          <p class="text-[var(--tf-muted)]">Analyse IA des factures à risque de non-paiement</p>
        </div>

        <!-- Business selector -->
        <div class="flex items-center gap-3" *ngIf="businesses().length > 0">
          <label class="text-xs font-bold uppercase tracking-widest text-[var(--tf-muted)] whitespace-nowrap">Business :</label>
          <select [(ngModel)]="selectedBusinessId" (ngModelChange)="onBusinessChange($event)"
                  class="bg-[var(--tf-surface-2)] text-[var(--tf-text)] border border-[var(--tf-border)] rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]">
            <option *ngFor="let b of businesses()" [value]="b.id">{{ b.name }}</option>
          </select>
          <button (click)="loadData()" class="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--tf-border)] hover:bg-[var(--tf-surface-3)] transition-all" title="Rafraîchir">
            <i class="fa-solid fa-rotate text-sm" [class.fa-spin]="loading"></i>
          </button>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-[var(--tf-surface-2)] p-6 rounded-2xl border border-[var(--tf-border)] shadow-sm">
          <span class="text-sm text-[var(--tf-muted)] block mb-1">📊 Total analysé</span>
          <strong class="text-2xl font-bold">{{ stats.total }}</strong>
        </div>
        <div class="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 shadow-sm">
          <span class="text-sm text-red-500 block mb-1">🔴 Risque Élevé</span>
          <strong class="text-2xl font-bold text-red-500">{{ stats.high }}</strong>
        </div>
        <div class="bg-yellow-500/10 p-6 rounded-2xl border border-yellow-500/20 shadow-sm">
          <span class="text-sm text-yellow-500 block mb-1">🟡 Risque Moyen</span>
          <strong class="text-2xl font-bold text-yellow-500">{{ stats.medium }}</strong>
        </div>
        <div class="bg-green-500/10 p-6 rounded-2xl border border-green-500/20 shadow-sm">
          <span class="text-sm text-green-500 block mb-1">🟢 Faible Risque</span>
          <strong class="text-2xl font-bold text-green-500">{{ stats.low }}</strong>
        </div>
      </div>

      <!-- Filtre niveau de risque -->
      <div class="mb-6">
        <select [(ngModel)]="filterRisk" (change)="applyFilter()"
                class="bg-[var(--tf-surface-2)] text-[var(--tf-text)] border border-[var(--tf-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">Tous les niveaux de risque</option>
          <option value="HIGH">🔴 Risque Élevé</option>
          <option value="MEDIUM">🟡 Risque Moyen</option>
          <option value="LOW">🟢 Faible Risque</option>
        </select>
      </div>

      <!-- Tableau -->
      <div class="bg-[var(--tf-surface-2)] rounded-2xl border border-[var(--tf-border)] overflow-hidden" *ngIf="!loading && filteredInvoices.length > 0">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr class="bg-[var(--tf-surface-3)] text-[var(--tf-muted)] text-xs uppercase tracking-wider">
                <th class="px-6 py-4 font-semibold">Facture</th>
                <th class="px-6 py-4 font-semibold">Client</th>
                <th class="px-6 py-4 font-semibold">Montant TTC</th>
                <th class="px-6 py-4 font-semibold">Échéance</th>
                <th class="px-6 py-4 font-semibold">Score Risque</th>
                <th class="px-6 py-4 font-semibold">Niveau</th>
                <th class="px-6 py-4 font-semibold">Action suggérée</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--tf-border)]">
              <tr *ngFor="let inv of filteredInvoices" class="hover:bg-[var(--tf-surface-3)] transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-primary-600 text-sm">{{ inv.invoiceNumber }}</td>
                <td class="px-6 py-4 font-medium text-sm">{{ inv.client?.name || inv.clientName || '—' }}</td>
                <td class="px-6 py-4 font-bold text-sm">{{ (inv.totalTTC || inv.totalAmount) | number:'1.2-2' }} <span class="text-xs opacity-50">TND</span></td>
                <td class="px-6 py-4 text-xs text-[var(--tf-muted)]">{{ inv.dueDate | date:'dd/MM/yyyy' }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-20 bg-[var(--tf-border)] rounded-full h-1.5 overflow-hidden">
                      <div class="h-full rounded-full transition-all"
                           [style.width]="(inv.riskScore * 100) + '%'"
                           [ngClass]="{
                             'bg-red-500': inv.riskLevel === 'HIGH',
                             'bg-yellow-500': inv.riskLevel === 'MEDIUM',
                             'bg-green-500': inv.riskLevel === 'LOW'
                           }"></div>
                    </div>
                    <span class="text-xs font-bold">{{ inv.riskScore | percent }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border"
                        [ngClass]="{
                          'bg-red-500/15 text-red-500 border-red-500/20': inv.riskLevel === 'HIGH',
                          'bg-yellow-500/15 text-yellow-600 border-yellow-500/20': inv.riskLevel === 'MEDIUM',
                          'bg-green-500/15 text-green-600 border-green-500/20': inv.riskLevel === 'LOW'
                        }">
                    {{ inv.riskEmoji }} {{ inv.riskLevel }}
                  </span>
                </td>
                <td class="px-6 py-4 text-xs italic text-[var(--tf-muted)] max-w-[200px]">{{ inv.action }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="mt-12 flex flex-col items-center gap-4 text-primary-500">
        <i class="fa-solid fa-robot text-4xl animate-bounce"></i>
        <span class="font-medium">🤖 Analyse IA en cours...</span>
      </div>

      <!-- Empty: no business -->
      <div *ngIf="!loading && businesses().length === 0" class="mt-12 text-center py-12 text-[var(--tf-muted)]">
        <i class="fa-solid fa-building text-3xl mb-4 block opacity-30"></i>
        <p class="font-medium">Aucun business trouvé pour votre compte.</p>
      </div>

      <!-- Empty: no invoices -->
      <div *ngIf="!loading && businesses().length > 0 && filteredInvoices.length === 0" class="mt-12 text-center py-12 text-[var(--tf-muted)]">
        <i class="fa-solid fa-file-invoice text-3xl mb-4 block opacity-30"></i>
        <p class="font-medium">Aucune facture trouvée pour ce niveau de risque.</p>
        <p class="text-sm mt-1" *ngIf="filterRisk">Essayez de supprimer le filtre de niveau.</p>
      </div>
    </div>
  `,
  styles: [`
    .ml-page { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class RiskComponent implements OnInit {
  private ml = inject(MlService);
  private businessSelection = inject(BusinessSelectionService);
  private settings = inject(SettingsService);
  private auth = inject(AuthService);

  businesses = signal<Array<{ id: string; name: string; tenantId: string }>>([]);
  selectedBusinessId = '';

  invoices: any[] = [];
  filteredInvoices: any[] = [];
  loading = true;
  filterRisk = '';

  stats = { total: 0, high: 0, medium: 0, low: 0 };

  private isAdmin(): boolean {
    const roles = this.auth.roles() as string[];
    return roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_ADMIN');
  }

  ngOnInit() {
    const tenantId =
      localStorage.getItem('activeTenantId') ||
      localStorage.getItem('tenantId') ||
      '';

    if (this.isAdmin() && tenantId) {
      // Admin: fetch businesses for their tenant, then load risks for first
      this.settings.getBusinessesForTenant(tenantId).subscribe({
        next: (bs: any[]) => {
          const list = (bs || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            tenantId: b.tenantId || b.companyId || tenantId,
          }));
          this.businesses.set(list);
          if (list.length > 0) {
            // Prefer previously selected business if still valid
            const existing = this.businessSelection.selectedBusinessId();
            const valid = list.find((b) => b.id === existing);
            const chosen = valid || list[0];
            this.selectBusiness(chosen.id, chosen.tenantId);
          } else {
            this.loading = false;
          }
        },
        error: () => { this.loading = false; },
      });
    } else {
      // Normal user: fetch their businesses
      this.settings.getBusinesses().subscribe({
        next: (bs: any[]) => {
          const list = (bs || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            tenantId: b.tenantId || b.companyId || tenantId,
          }));
          this.businesses.set(list);
          if (list.length > 0) {
            const existing = this.businessSelection.selectedBusinessId();
            const valid = list.find((b) => b.id === existing);
            const chosen = valid || list[0];
            this.selectBusiness(chosen.id, chosen.tenantId);
          } else {
            this.loading = false;
          }
        },
        error: () => { this.loading = false; },
      });
    }
  }

  onBusinessChange(id: string) {
    const b = this.businesses().find((x) => x.id === id);
    if (b) this.selectBusiness(b.id, b.tenantId);
  }

  private selectBusiness(businessId: string, tenantId: string) {
    this.selectedBusinessId = businessId;
    this.businessSelection.setSelectedBusiness(businessId, tenantId);
    this.loadData();
  }

  loadData() {
    if (!this.selectedBusinessId) return;
    this.loading = true;
    this.ml.getAllRisks().subscribe({
      next: (res: any) => {
        const invList: any[] = res.invoices || (Array.isArray(res) ? res : []);
        this.invoices = invList.map((inv: any) => {
          const score = inv.riskScore || 0;
          let level: string = inv.riskLevel || 'LOW';
          let emoji = inv.riskEmoji || '🟢';
          let action = inv.message || 'Facture saine, aucun suivi particulier.';

          if (score > 0.67 || level === 'HIGH') {
            level = 'HIGH'; emoji = '🔴';
            action = 'Urgent : Contacter le client, risque d\'impayé élevé.';
          } else if (score > 0.33 || level === 'MEDIUM') {
            level = 'MEDIUM'; emoji = '🟡';
            action = 'Suivi recommandé : Envoyer un rappel automatique.';
          } else {
            level = 'LOW'; emoji = '🟢';
            action = 'Facture saine, aucun suivi particulier.';
          }

          return {
            ...inv,
            invoiceNumber: inv.number || inv.invoiceNumber || `INV-${(inv.id || '').substring(0, 8)}`,
            riskScore: score,
            riskLevel: level,
            riskEmoji: emoji,
            action,
          };
        });

        this.stats = res.stats
          ? { total: res.stats.total || 0, high: res.stats.high || 0, medium: res.stats.medium || 0, low: res.stats.low || 0 }
          : {
              total: this.invoices.length,
              high: this.invoices.filter(i => i.riskLevel === 'HIGH').length,
              medium: this.invoices.filter(i => i.riskLevel === 'MEDIUM').length,
              low: this.invoices.filter(i => i.riskLevel === 'LOW').length,
            };

        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilter() {
    this.filteredInvoices = this.filterRisk
      ? this.invoices.filter(i => i.riskLevel === this.filterRisk)
      : [...this.invoices];
  }
}
