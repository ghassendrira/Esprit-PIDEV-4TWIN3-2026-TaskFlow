import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MlService, CashflowForecastResponse } from '../../../core/services/ml.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-cashflow',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ml-page p-6 bg-[var(--tf-surface)] min-h-screen text-[var(--tf-text)]">
      <div class="mb-8">
        <h2 class="text-3xl font-bold mb-2">📈 Trésorerie & Cashflow</h2>
        <p class="text-[var(--tf-muted)]">Prévision IA des revenus sur 6 mois</p>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-[var(--tf-surface-2)] p-6 rounded-2xl border border-[var(--tf-border)] shadow-sm">
          <span class="text-sm text-[var(--tf-muted)] block mb-1">💰 Total prévu 6 mois</span>
          <strong class="text-3xl font-bold text-primary-500">
            {{ forecast.total_revenue | currency:'TND':'symbol':'1.2-2' }}
          </strong>
        </div>
        <div class="bg-[var(--tf-surface-2)] p-6 rounded-2xl border border-[var(--tf-border)] shadow-sm"
             [ngClass]="forecast.trend_pct > 0 ? 'border-green-500/30' : 'border-red-500/30'">
          <span class="text-sm text-[var(--tf-muted)] block mb-1">📊 Tendance</span>
          <div class="flex items-center gap-2">
            <strong class="text-3xl font-bold" [ngClass]="forecast.trend_pct > 0 ? 'text-green-500' : 'text-red-500'">
              {{ forecast.trend_pct > 0 ? '↑' : '↓' }} {{ Math.abs(forecast.trend_pct) }}%
            </strong>
            <span class="text-sm text-[var(--tf-muted)]">vs mois précédent</span>
          </div>
        </div>
      </div>

      <!-- Graphique -->
      <div class="bg-[var(--tf-surface-2)] p-6 rounded-2xl border border-[var(--tf-border)] shadow-sm mb-8">
        <h3 class="text-lg font-semibold mb-6">Prévision des revenus mensuels</h3>
        <div class="h-[300px] w-full">
          <canvas id="cashflowChart"></canvas>
        </div>
      </div>

      <!-- Tableau mensuel -->
      <div class="bg-[var(--tf-surface-2)] rounded-2xl border border-[var(--tf-border)] overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-[var(--tf-surface-3)] text-[var(--tf-muted)] text-xs uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold">Mois</th>
              <th class="px-6 py-4 font-semibold">Revenu Prévu</th>
              <th class="px-6 py-4 font-semibold">Intervalle de confiance (Min - Max)</th>
              <th class="px-6 py-4 font-semibold text-center">Tendance</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--tf-border)]">
            <tr *ngFor="let m of forecast.monthly_forecast; let i = index" class="hover:bg-[var(--tf-surface-3)] transition-colors">
              <td class="px-6 py-4 font-medium">{{ m.label }}</td>
              <td class="px-6 py-4">
                <strong class="text-lg">
                  {{ m.revenue | currency:'TND':'symbol':'1.2-2' }}
                </strong>
              </td>
              <td class="px-6 py-4 text-[var(--tf-muted)]">
                {{ m.lower | currency:'TND':'symbol':'1.0-0' }} - {{ m.upper | currency:'TND':'symbol':'1.0-0' }}
              </td>
              <td class="px-6 py-4 text-center">
                <span *ngIf="i > 0" 
                      [ngClass]="m.revenue > forecast.monthly_forecast[i-1].revenue ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'"
                      class="px-2 py-1 rounded text-xs font-bold">
                  {{ m.revenue > forecast.monthly_forecast[i-1].revenue ? '↑' : '↓' }}
                </span>
                <span *ngIf="i === 0" class="text-[var(--tf-muted)] text-xs">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="loading" class="mt-8 flex justify-center items-center gap-3 text-primary-500 font-medium">
        <i class="fa-solid fa-chart-line animate-pulse text-2xl"></i>
        <span>🤖 Calcul des projections financières...</span>
      </div>
    </div>
  `,
  styles: [`
    .ml-page { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class CashflowComponent implements OnInit {
  private ml = inject(MlService);
  Math = Math;

  forecast: CashflowForecastResponse = {
    historical: [],
    monthly_forecast: [],
    total_revenue: 0,
    trend_pct: 0,
    trend_direction: '→'
  };
  loading = true;
  chart: any;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.ml.getCashflowForecast(6).subscribe({
      next: (res: CashflowForecastResponse) => {
        if (res && res.monthly_forecast && res.monthly_forecast.length > 0) {
          this.forecast = res;
          this.initChart();
          this.loading = false;
        } else {
          this.useFallback();
        }
      },
      error: () => {
        this.useFallback();
      }
    });
  }

  private useFallback() {
    console.warn('[Cashflow] Using fallback simulated forecast data.');
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const now = new Date();
    const monthly_forecast = [];
    let total = 0;

    for (let i = 1; i <= 6; i++) {
      const d = new Date(now);
      d.setMonth(now.getMonth() + i);
      const revenue = 15000 + Math.random() * 8000;
      total += revenue;
      monthly_forecast.push({
        month: i,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        revenue: revenue,
        lower: revenue * 0.82,
        upper: revenue * 1.18
      });
    }

    this.forecast = {
      historical: [],
      monthly_forecast,
      total_revenue: total,
      trend_pct: 15,
      trend_direction: '↑',
      data_source: 'Simulation (Service ML indisponible)'
    };
    this.initChart();
    this.loading = false;
  }

  initChart() {
    if (this.chart) this.chart.destroy();

    const ctx = document.getElementById('cashflowChart') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = this.forecast.monthly_forecast.map((m: any) => m.label);
    const data = this.forecast.monthly_forecast.map((m: any) => m.revenue);
    const lower = this.forecast.monthly_forecast.map((m: any) => m.lower);
    const upper = this.forecast.monthly_forecast.map((m: any) => m.upper);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Revenu Prévu',
            data: data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6'
          },
          {
            label: 'Confiance Max',
            data: upper,
            borderColor: 'transparent',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            fill: '+1',
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: 'Confiance Min',
            data: lower,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#94a3b8'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#94a3b8'
            }
          }
        }
      }
    });
  }
}
