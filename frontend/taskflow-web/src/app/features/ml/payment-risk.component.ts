import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { MlAnalyticsService, InvoiceMlRow } from '../../core/services/ml-analytics.service';
import { BusinessSelectionService } from '../../core/services/business-selection.service';
import { riskLevelColor } from '../../core/utils/ml-risk.util';

Chart.register(...registerables);

@Component({
  selector: 'tf-payment-risk',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 text-slate-100">
      <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <a routerLink="/dashboard" class="text-xs font-semibold text-blue-400 hover:text-blue-300 mb-2 inline-block">← Dashboard</a>
          <h1 class="text-2xl font-bold tracking-tight">Risque de paiement</h1>
          <p class="text-sm text-slate-400 mt-1">Scoring ML par facture (tenant courant).</p>
        </div>
      </header>

      <div *ngIf="!businessId()" class="rounded-2xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
        Sélectionnez un business (Settings) pour charger les données.
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4" *ngIf="businessId()">
        <div class="rounded-2xl border border-white/5 bg-[#1e2937] p-6 lg:col-span-1">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Score global</p>
          <p class="text-4xl font-black mt-2" [style.color]="globalColor()">{{ globalScore() ?? '—' }}</p>
          <p class="text-sm font-semibold mt-1" [style.color]="globalColor()">{{ globalLabel() }}</p>
          <p class="text-xs text-slate-500 mt-4">Moyenne des scores sur l’ensemble des factures du business.</p>
        </div>
        <div class="rounded-2xl border border-white/5 bg-[#1e2937] p-4 lg:col-span-2 min-h-[240px]">
          <p class="text-sm font-bold text-slate-200 mb-2">Répartition par niveau</p>
          <div class="h-[200px] flex items-center justify-center">
            <canvas #riskChart></canvas>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-white/5 bg-[#1e2937] overflow-hidden" *ngIf="businessId()">
        <div class="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 class="font-bold text-slate-100">Factures</h2>
          <span *ngIf="loading()" class="text-xs text-slate-500">Chargement…</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-[#0f172a] text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th class="px-4 py-3">N°</th>
                <th class="px-4 py-3">Client</th>
                <th class="px-4 py-3 text-right">Montant</th>
                <th class="px-4 py-3">Score</th>
                <th class="px-4 py-3">Probabilité</th>
                <th class="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr *ngFor="let row of rows()" class="hover:bg-white/5">
                <td class="px-4 py-3 font-mono text-blue-400">{{ row.invoiceNumber }}</td>
                <td class="px-4 py-3">{{ row.clientName }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ row.totalAmount | number:'1.2-2' }} TND</td>
                <td class="px-4 py-3">
                  <span class="font-bold" [style.color]="riskLevelColor(row.riskLevel)">{{ row.riskScore }}</span>
                </td>
                <td class="px-4 py-3">{{ row.riskProbability | percent:'1.0-0' }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-white/10"
                        [style.color]="riskLevelColor(row.riskLevel)">{{ row.riskLabel }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class PaymentRiskComponent implements AfterViewInit, OnDestroy {
  @ViewChild('riskChart') riskCanvas!: ElementRef<HTMLCanvasElement>;

  private mlAnalytics = inject(MlAnalyticsService);
  private businessSelection = inject(BusinessSelectionService);

  businessId = computed(() => this.businessSelection.selectedBusinessId());
  rows = signal<InvoiceMlRow[]>([]);
  loading = signal(false);

  globalScore = computed(() => {
    const r = this.rows();
    if (!r.length) return null as number | null;
    return Math.round(r.reduce((s, x) => s + x.riskScore, 0) / r.length);
  });

  globalLabel = computed(() => {
    const r = this.rows();
    if (!r.some((x) => x.riskLevel === 'HIGH') && !r.some((x) => x.riskLevel === 'MEDIUM'))
      return 'Risque faible';
    if (r.some((x) => x.riskLevel === 'HIGH')) return 'Risque élevé';
    return 'Risque modéré';
  });

  globalColor = computed(() => {
    const r = this.rows();
    if (r.some((x) => x.riskLevel === 'HIGH')) return '#ef4444';
    if (r.some((x) => x.riskLevel === 'MEDIUM')) return '#f59e0b';
    return '#22c55e';
  });

  private chart?: Chart;

  ngAfterViewInit(): void {
    const id = this.businessId();
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.mlAnalytics.loadInvoicesWithRisk(id).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
        setTimeout(() => this.renderChart(list), 0);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(rows: InvoiceMlRow[]) {
    this.chart?.destroy();
    const canvas = this.riskCanvas?.nativeElement;
    if (!canvas) return;

    let h = 0,
      m = 0,
      l = 0;
    for (const r of rows) {
      if (r.riskLevel === 'HIGH') h++;
      else if (r.riskLevel === 'MEDIUM') m++;
      else l++;
    }

    const cfg: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Élevé', 'Modéré', 'Faible'],
        datasets: [
          {
            data: [h, m, l],
            backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', boxWidth: 12 },
          },
        },
      },
    };
    this.chart = new Chart(canvas, cfg);
  }

  riskLevelColor = riskLevelColor;
}
