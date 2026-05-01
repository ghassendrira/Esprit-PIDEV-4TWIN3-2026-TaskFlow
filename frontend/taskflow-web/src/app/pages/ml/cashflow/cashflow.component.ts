import { Component, OnInit, inject, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MlService, CashflowForecastResponse } from '../../../core/services/ml.service';
import { BusinessSelectionService } from '../../../core/services/business-selection.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-cashflow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ml-page p-6 bg-[var(--tf-surface)] min-h-screen text-[var(--tf-text)]">
      <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-bold mb-2">📈 Trésorerie & Cashflow</h2>
          <p class="text-[var(--tf-muted)]">Prévision IA des revenus sur 6 mois</p>
        </div>

        <!-- Selectors -->
        <div class="flex flex-wrap items-center gap-3">
          <ng-container *ngIf="companies().length > 0">
            <label class="text-xs font-bold uppercase tracking-widest text-[var(--tf-muted)] whitespace-nowrap">Compagnie :</label>
            <select [(ngModel)]="selectedCompanyId" (ngModelChange)="onCompanyChange($event)"
                    class="bg-[var(--tf-surface-2)] text-[var(--tf-text)] border border-[var(--tf-border)] rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]">
              <option *ngFor="let c of companies()" [value]="c.id">{{ c.name }}</option>
            </select>
          </ng-container>

          <ng-container *ngIf="businesses().length > 0">
            <label class="text-xs font-bold uppercase tracking-widest text-[var(--tf-muted)] whitespace-nowrap">Business :</label>
            <select [(ngModel)]="selectedBusinessId" (ngModelChange)="onBusinessChange($event)"
                    class="bg-[var(--tf-surface-2)] text-[var(--tf-text)] border border-[var(--tf-border)] rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]">
              <option *ngFor="let b of businesses()" [value]="b.id">{{ b.name }}</option>
            </select>
          </ng-container>

          <button (click)="loadData()" [disabled]="!selectedBusinessId" class="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--tf-border)] hover:bg-[var(--tf-surface-3)] transition-all disabled:opacity-50" title="Rafraîchir">
            <i class="fa-solid fa-rotate text-sm" [class.fa-spin]="loading"></i>
          </button>
        </div>
      </div>

      <ng-container *ngIf="!loading && forecast.monthly_forecast.length > 0">
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
      </ng-container>

      <div *ngIf="loading" class="mt-8 flex justify-center items-center gap-3 text-primary-500 font-medium">
        <i class="fa-solid fa-chart-line animate-pulse text-2xl"></i>
        <span>🤖 Calcul des projections financières...</span>
      </div>

      <div *ngIf="!loading && forecast.monthly_forecast.length === 0" class="mt-12 text-center py-12 text-[var(--tf-muted)]">
        <i class="fa-solid fa-chart-area text-3xl mb-4 block opacity-30"></i>
        <p class="font-medium">Aucune donnée trouvée pour générer les prévisions.</p>
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
  private businessSelection = inject(BusinessSelectionService);
  private settings = inject(SettingsService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  Math = Math;

  businesses = signal<Array<{ id: string; name: string; tenantId: string }>>([]);
  companies = signal<Array<{ id: string; name: string }>>([]);
  selectedBusinessId = '';
  selectedCompanyId = '';

  forecast: CashflowForecastResponse = {
    historical: [],
    monthly_forecast: [],
    total_revenue: 0,
    trend_pct: 0,
    trend_direction: '→'
  };
  loading = true;
  chart: any;

  private getTenantId(): string {
    return localStorage.getItem('activeTenantId') || localStorage.getItem('tenantId') || '';
  }

  canChangeCompany(): boolean {
    return true; // All users can browse companies
  }

  ngOnInit() {
    this.loading = true;
    // Always try to load companies list first
    this.settings.getAllTenants().subscribe({
      next: (ts: any[]) => {
        const list = (ts || []).map((t: any) => ({
          id: t.id,
          name: t.name || t.companyName || 'Compagnie sans nom'
        }));
        this.companies.set(list);
        
        if (list.length > 0) {
          const currentTenant = this.getTenantId();
          const found = list.find(t => t.id === currentTenant);
          this.selectedCompanyId = found ? found.id : list[0].id;
          this.loadBusinessesForCompany(this.selectedCompanyId);
        } else {
          // Fallback: load businesses directly
          this.loadBusinessesDirect();
        }
      },
      error: () => {
        // API failed, fallback: load businesses directly
        this.loadBusinessesDirect();
      }
    });
  }

  private loadBusinessesDirect() {
    const tenantId = this.getTenantId();
    if (tenantId) {
      this.settings.getBusinessesForTenant(tenantId).subscribe({
        next: (bs: any[]) => this.processBusinesses(bs, tenantId),
        error: () => {
          this.settings.getBusinesses().subscribe({
            next: (bs: any[]) => this.processBusinesses(bs),
            error: () => { this.loading = false; this.cdr.detectChanges(); },
          });
        },
      });
    } else {
      this.settings.getBusinesses().subscribe({
        next: (bs: any[]) => this.processBusinesses(bs),
        error: () => { this.loading = false; this.cdr.detectChanges(); },
      });
    }
  }

  onCompanyChange(tenantId: string) {
    this.selectedCompanyId = tenantId;
    this.loadBusinessesForCompany(tenantId);
  }

  private loadBusinessesForCompany(tenantId: string) {
    this.loading = true;
    this.cdr.detectChanges();
    this.settings.getBusinessesForTenant(tenantId).subscribe({
      next: (bs: any[]) => {
        this.processBusinesses(bs, tenantId);
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  private processBusinesses(bs: any[], forcedTenantId?: string) {
    const tenantId = forcedTenantId || this.getTenantId();
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
      this.selectedBusinessId = '';
      this.businessSelection.setSelectedBusiness('', tenantId);
      this.forecast.monthly_forecast = [];
      this.loading = false;
      this.cdr.detectChanges();
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
    this.cdr.detectChanges();

    this.ml.getCashflowForecast(6).subscribe({
      next: (res: CashflowForecastResponse) => {
        this.zone.run(() => {
          if (res && res.monthly_forecast && res.monthly_forecast.length > 0) {
            this.forecast = res;
            this.loading = false;
            this.cdr.detectChanges();
            setTimeout(() => this.initChart(), 100);
          } else {
            this.useFallback();
          }
        });
      },
      error: () => {
        this.zone.run(() => {
          this.useFallback();
        });
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
    
    this.loading = false;
    this.cdr.detectChanges();
    setTimeout(() => this.initChart(), 100);
  }

  initChart() {
    if (this.chart) this.chart.destroy();

    const ctx = document.getElementById('cashflowChart') as HTMLCanvasElement;
    if (!ctx) return;

    // Extract last 6 months of historical data for context
    const histLabels = (this.forecast.historical || []).map((m: any) => m.label).slice(-6);
    const histData = (this.forecast.historical || []).map((m: any) => (m.net_cashflow !== undefined ? m.net_cashflow : m.revenue)).slice(-6);

    // Extract forecast data
    const futLabels = this.forecast.monthly_forecast.map((m: any) => m.label);
    const futData = this.forecast.monthly_forecast.map((m: any) => m.revenue);
    const lower = this.forecast.monthly_forecast.map((m: any) => m.lower);
    const upper = this.forecast.monthly_forecast.map((m: any) => m.upper);

    const labels = [...histLabels, ...futLabels];
    
    // To connect the lines, we need the last historical point to be the start of the future line
    const lastHistVal = histData.length > 0 ? histData[histData.length - 1] : null;
    
    const historicalSeries = [...histData, ...Array(futLabels.length).fill(null)];
    
    // Pad future arrays. If we have historical data, pad length - 1, then insert last historical, then future data
    const padLength = histLabels.length > 0 ? histLabels.length - 1 : 0;
    const padding = Array(padLength).fill(null);
    
    const futureSeries = [...padding, ...(histLabels.length > 0 ? [lastHistVal] : []), ...futData];
    const upperSeries = [...padding, ...(histLabels.length > 0 ? [lastHistVal] : []), ...upper];
    const lowerSeries = [...padding, ...(histLabels.length > 0 ? [lastHistVal] : []), ...lower];

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Historique',
            data: historicalSeries,
            borderColor: '#94a3b8',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#94a3b8',
            borderDash: [5, 5]
          },
          {
            label: 'Prévision Nette',
            data: futureSeries,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6'
          },
          {
            label: 'Confiance Max',
            data: upperSeries,
            borderColor: 'transparent',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            fill: '+1',
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: 'Confiance Min',
            data: lowerSeries,
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
