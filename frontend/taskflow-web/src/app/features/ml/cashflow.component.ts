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
import { MlService, CashflowForecastResponse } from '../../core/services/ml.service';
import { BusinessSelectionService } from '../../core/services/business-selection.service';

Chart.register(...registerables);

@Component({
  selector: 'tf-cashflow',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 text-slate-100">
      <header>
        <a routerLink="/dashboard" class="text-xs font-semibold text-blue-400 hover:text-blue-300 mb-2 inline-block">← Dashboard</a>
        <h1 class="text-2xl font-bold tracking-tight">Trésorerie & Prophet</h1>
        <p class="text-sm text-slate-400 mt-1">Prévision des encaissements avec bande d’incertitude.</p>
      </header>

      <div *ngIf="error()" class="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
        {{ error() }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4" *ngIf="forecast() as fc">
        <div class="rounded-2xl border border-white/5 bg-[#1e2937] p-5">
          <p class="text-xs font-semibold uppercase text-slate-400">30 jours (M+1)</p>
          <p class="text-2xl font-black text-blue-400 mt-1">{{ card30() | number:'1.0-0' }} TND</p>
        </div>
        <div class="rounded-2xl border border-white/5 bg-[#1e2937] p-5">
          <p class="text-xs font-semibold uppercase text-slate-400">90 jours (3 mois)</p>
          <p class="text-2xl font-black text-blue-400 mt-1">{{ card90() | number:'1.0-0' }} TND</p>
        </div>
        <div class="rounded-2xl border border-white/5 bg-[#1e2937] p-5">
          <p class="text-xs font-semibold uppercase text-slate-400">Tendance vs historique</p>
          <p class="text-2xl font-black mt-1" [class.text-emerald-400]="fc.trend_pct > 0" [class.text-rose-400]="fc.trend_pct <= 0">
            {{ fc.trend_direction }} {{ fc.trend_pct }}%
          </p>
        </div>
      </div>

      <div class="rounded-2xl border border-white/5 bg-[#1e2937] p-4 min-h-[360px]">
        <p class="text-sm font-bold text-slate-200 mb-2">Courbe prévision (Prophet) + bornes</p>
        <div class="h-[300px] relative">
          <canvas #lineChart class="max-h-[300px]"></canvas>
          <p *ngIf="!forecast()" class="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Chargement…</p>
        </div>
      </div>

      <div class="rounded-2xl border border-white/5 bg-[#1e2937] overflow-hidden" *ngIf="forecast() as fc">
        <div class="px-5 py-4 border-b border-white/5 font-bold">Détail mensuel</div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-[#0f172a] text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th class="px-4 py-3">Période</th>
                <th class="px-4 py-3 text-right">Prévision</th>
                <th class="px-4 py-3 text-right">Borne basse</th>
                <th class="px-4 py-3 text-right">Borne haute</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr *ngFor="let m of fc.monthly_forecast" class="hover:bg-white/5">
                <td class="px-4 py-3">{{ m.label }}</td>
                <td class="px-4 py-3 text-right font-semibold text-blue-300">{{ m.revenue | number:'1.2-2' }}</td>
                <td class="px-4 py-3 text-right text-slate-400">{{ m.lower | number:'1.2-2' }}</td>
                <td class="px-4 py-3 text-right text-slate-400">{{ m.upper | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class CashflowComponent implements AfterViewInit, OnDestroy {
  @ViewChild('lineChart') lineCanvas!: ElementRef<HTMLCanvasElement>;

  private ml = inject(MlService);
  private businessSelection = inject(BusinessSelectionService);

  forecast = signal<CashflowForecastResponse | null>(null);
  error = signal<string | null>(null);

  card30 = computed(() => {
    const f = this.forecast();
    return f?.monthly_forecast?.[0]?.revenue ?? 0;
  });

  card90 = computed(() => {
    const f = this.forecast();
    if (!f?.monthly_forecast?.length) return 0;
    const take = Math.min(3, f.monthly_forecast.length);
    let s = 0;
    for (let i = 0; i < take; i++) s += f.monthly_forecast[i].revenue;
    return s;
  });

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.ml.getCashflowForecast(12).subscribe({
      next: (data) => {
        this.forecast.set(data);
        this.error.set(null);
        setTimeout(() => this.renderLine(data), 0);
      },
      error: () => {
        this.forecast.set(null);
        this.error.set('Impossible de charger la prévision (service ML ou modèle Prophet).');
      },
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderLine(data: CashflowForecastResponse) {
    this.chart?.destroy();
    const canvas = this.lineCanvas?.nativeElement;
    if (!canvas || !data.monthly_forecast?.length) return;

    const labels = data.monthly_forecast.map((m) => m.label);
    const mid = data.monthly_forecast.map((m) => m.revenue);
    const low = data.monthly_forecast.map((m) => m.lower);
    const high = data.monthly_forecast.map((m) => m.upper);

    const cfg: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Borne basse',
            data: low,
            borderColor: 'rgba(148,163,184,0.35)',
            fill: false,
            tension: 0.35,
            pointRadius: 0,
            borderDash: [4, 4],
          },
          {
            label: 'Prévision',
            data: mid,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.12)',
            fill: true,
            tension: 0.35,
          },
          {
            label: 'Borne haute',
            data: high,
            borderColor: 'rgba(148,163,184,0.35)',
            fill: false,
            tension: 0.35,
            pointRadius: 0,
            borderDash: [4, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        },
        plugins: { legend: { labels: { color: '#e2e8f0' } } },
      },
    };
    this.chart = new Chart(canvas, cfg);
  }
}
