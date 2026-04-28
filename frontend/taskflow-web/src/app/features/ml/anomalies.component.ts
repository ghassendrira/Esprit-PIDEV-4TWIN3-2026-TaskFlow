import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MlAnalyticsService, InvoiceMlRow } from '../../core/services/ml-analytics.service';
import { BusinessSelectionService } from '../../core/services/business-selection.service';
import { riskLevelColor } from '../../core/utils/ml-risk.util';

@Component({
  selector: 'tf-anomalies',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 text-slate-100">
      <header>
        <a routerLink="/dashboard" class="text-xs font-semibold text-blue-400 hover:text-blue-300 mb-2 inline-block">← Dashboard</a>
        <h1 class="text-2xl font-bold tracking-tight">Anomalies</h1>
        <p class="text-sm text-slate-400 mt-1">Factures atypiques détectées par isolation forest.</p>
      </header>

      <div
        *ngIf="highCount() > 0"
        class="rounded-2xl border border-rose-500/40 bg-rose-950/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <span class="text-2xl">⚠️</span>
        <div>
          <p class="font-bold text-rose-100">{{ highCount() }} facture(s) en alerte haute</p>
          <p class="text-sm text-rose-200/80">Contrôlez les montants et le profil client avant validation.</p>
        </div>
      </div>

      <div *ngIf="!businessId()" class="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
        Sélectionnez un business pour lister les anomalies.
      </div>

      <div class="rounded-2xl border border-white/5 bg-[#1e2937] overflow-hidden" *ngIf="businessId()">
        <div class="px-5 py-4 border-b border-white/5 flex justify-between">
          <h2 class="font-bold">Anomalies détectées</h2>
          <span *ngIf="loading()" class="text-xs text-slate-500">Analyse ML…</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-[#0f172a] text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th class="px-4 py-3">Facture</th>
                <th class="px-4 py-3">Client</th>
                <th class="px-4 py-3 text-right">Montant</th>
                <th class="px-4 py-3">Type</th>
                <th class="px-4 py-3">Score</th>
                <th class="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr *ngFor="let row of anomalyRows()" class="hover:bg-white/5">
                <td class="px-4 py-3 font-mono text-blue-400">{{ row.invoiceNumber }}</td>
                <td class="px-4 py-3">{{ row.clientName }}</td>
                <td class="px-4 py-3 text-right">{{ row.totalAmount | number:'1.2-2' }} TND</td>
                <td class="px-4 py-3">
                  <span class="text-xs font-bold" [style.color]="levelColor(row.riskLevel)">{{ row.anomaly.is_anomaly ? 'Anomalie' : 'Normal' }}</span>
                </td>
                <td class="px-4 py-3 font-mono text-xs">{{ row.anomaly.anomaly_score | number:'1.4-4' }}</td>
                <td class="px-4 py-3 text-right">
                  <a [routerLink]="['/invoices', row.id]" class="text-blue-400 hover:text-blue-300 text-xs font-bold">Revoir →</a>
                </td>
              </tr>
              <tr *ngIf="!anomalyRows().length && !loading()">
                <td colspan="6" class="px-4 py-10 text-center text-slate-500 italic">Aucune anomalie sur les factures analysées.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class AnomaliesComponent implements OnInit {
  private mlAnalytics = inject(MlAnalyticsService);
  private businessSelection = inject(BusinessSelectionService);

  businessId = computed(() => this.businessSelection.selectedBusinessId());
  rows = signal<InvoiceMlRow[]>([]);
  loading = signal(false);

  anomalyRows = computed(() =>
    this.rows().filter((r) => r.anomaly.is_anomaly || r.riskLevel === 'HIGH'),
  );

  highCount = computed(() => this.rows().filter((r) => r.riskLevel === 'HIGH').length);

  ngOnInit(): void {
    const bid = this.businessId();
    if (!bid) return;
    this.loading.set(true);
    this.mlAnalytics.loadInvoicesWithRisk(bid).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  levelColor = riskLevelColor;
}
