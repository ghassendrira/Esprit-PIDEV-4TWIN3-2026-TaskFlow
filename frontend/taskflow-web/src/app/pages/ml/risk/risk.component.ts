import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MlService } from '../../../core/services/ml.service';

@Component({
  selector: 'app-risk',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ml-page p-6 bg-[var(--tf-surface)] min-h-screen text-[var(--tf-text)]">
      <div class="mb-8">
        <h2 class="text-3xl font-bold mb-2">⚠️ Risque de Paiement</h2>
        <p class="text-[var(--tf-muted)]">Analyse IA des factures à risque</p>
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

      <!-- Filtre -->
      <div class="mb-6">
        <select [(ngModel)]="filterRisk" (change)="applyFilter()" 
                class="bg-[var(--tf-surface-2)] text-[var(--tf-text)] border border-[var(--tf-border)] rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">Tous les niveaux</option>
          <option value="HIGH">🔴 Risque Élevé</option>
          <option value="MEDIUM">🟡 Risque Moyen</option>
          <option value="LOW">🟢 Faible Risque</option>
        </select>
      </div>

      <!-- Tableau -->
      <div class="bg-[var(--tf-surface-2)] rounded-2xl border border-[var(--tf-border)] overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-[var(--tf-surface-3)] text-[var(--tf-muted)] text-sm uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold">Facture</th>
              <th class="px-6 py-4 font-semibold">Client</th>
              <th class="px-6 py-4 font-semibold">Montant</th>
              <th class="px-6 py-4 font-semibold">Score Risque</th>
              <th class="px-6 py-4 font-semibold">Niveau</th>
              <th class="px-6 py-4 font-semibold">Action suggérée</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--tf-border)]">
            <tr *ngFor="let inv of filteredInvoices" class="hover:bg-[var(--tf-surface-3)] transition-colors">
              <td class="px-6 py-4 font-medium">{{ inv.invoiceNumber }}</td>
              <td class="px-6 py-4">{{ inv.client?.name || 'N/A' }}</td>
              <td class="px-6 py-4">{{ inv.totalTTC | currency:'TND':'symbol':'1.2-2' }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-24 bg-[var(--tf-border)] rounded-full h-2 overflow-hidden">
                    <div class="h-full rounded-full transition-all"
                         [style.width]="(inv.riskScore * 100) + '%'"
                         [ngClass]="{
                           'bg-red-500': inv.riskLevel === 'HIGH',
                           'bg-yellow-500': inv.riskLevel === 'MEDIUM',
                           'bg-green-500': inv.riskLevel === 'LOW'
                         }">
                    </div>
                  </div>
                  <span class="text-sm font-medium">{{ inv.riskScore | percent }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                      [ngClass]="{
                        'bg-red-500/20 text-red-500': inv.riskLevel === 'HIGH',
                        'bg-yellow-500/20 text-yellow-500': inv.riskLevel === 'MEDIUM',
                        'bg-green-500/20 text-green-500': inv.riskLevel === 'LOW'
                      }">
                  {{ inv.riskEmoji }} {{ inv.riskLevel }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm italic text-[var(--tf-muted)]">{{ inv.action }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="loading" class="mt-8 flex justify-center items-center gap-3 text-primary-500 font-medium">
        <i class="fa-solid fa-robot animate-bounce text-2xl"></i>
        <span>🤖 Analyse IA en cours...</span>
      </div>

      <div *ngIf="!loading && filteredInvoices.length === 0" class="mt-8 text-center py-12 text-[var(--tf-muted)]">
        <p>Aucune facture trouvée pour ce niveau de risque.</p>
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

  invoices: any[] = [];
  filteredInvoices: any[] = [];
  loading = true;
  filterRisk = '';

  stats = {
    total: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.ml.getAllRisks().subscribe({
      next: (res: any) => {
        const invList = res.invoices || res;
        this.invoices = invList.map((inv: any) => {
          const score = inv.riskScore || 0;
          let level = inv.riskLevel || 'LOW';
          let emoji = inv.riskEmoji || '🟢';
          let action = inv.message || 'Facture saine, aucun suivi particulier.';

          if (score > 0.67 || level === 'HIGH') {
            level = 'HIGH';
            emoji = '🔴';
            action = 'Urgent: Contacter le client, risque d\'impayé élevé.';
          } else if (score > 0.33 || level === 'MEDIUM') {
            level = 'MEDIUM';
            emoji = '🟡';
            action = 'Suivi recommandé: Envoyer un rappel automatique.';
          }

          return {
            ...inv,
            invoiceNumber: inv.number || inv.invoiceNumber || `INV-${inv.id?.substring(0,8)}`,
            riskScore: score,
            riskLevel: level,
            riskEmoji: emoji,
            action: action
          };
        });
        
        if (res.stats) {
          this.stats = {
            total: res.stats.total || 0,
            high: res.stats.high || 0,
            medium: res.stats.medium || 0,
            low: res.stats.low || 0
          };
        } else {
          this.updateStats();
        }
        
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  updateStats() {
    this.stats = {
      total: this.invoices.length,
      high: this.invoices.filter(i => i.riskLevel === 'HIGH').length,
      medium: this.invoices.filter(i => i.riskLevel === 'MEDIUM').length,
      low: this.invoices.filter(i => i.riskLevel === 'LOW').length
    };
  }

  applyFilter() {
    if (!this.filterRisk) {
      this.filteredInvoices = [...this.invoices];
    } else {
      this.filteredInvoices = this.invoices.filter(i => i.riskLevel === this.filterRisk);
    }
  }
}
