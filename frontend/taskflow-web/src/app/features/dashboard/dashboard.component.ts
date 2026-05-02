import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { TfTableComponent } from '../../shared/ui/table/tf-table.component';
import { MlService, CashflowForecastResponse } from '../../core/services/ml.service';
import { MlAnalyticsService, DashboardMlSnapshot } from '../../core/services/ml-analytics.service';
import { BusinessSelectionService } from '../../core/services/business-selection.service';
import { AuthService } from '../../core/services/auth.service';
import { riskLevelColor } from '../../core/utils/ml-risk.util';
import { InvoicesService } from '../../core/services/invoices.service';

@Component({
  selector: 'tf-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TfCardComponent, TfTableComponent],
  template: `
    <div class="space-y-8">
      <header class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight" style="color: var(--tf-on-surface);">Dashboard</h1>
          <p class="text-sm muted mt-1">Vue consolidée — business sélectionné : données filtrées par tenant.</p>
        </div>
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
          style="border-color: var(--tf-border); background: var(--tf-card); color: var(--tf-muted);"
        >
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Ce mois</span>
        </div>
      </header>

      <!-- KPI financiers -->
      <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <tf-card>
          <div class="flex flex-col gap-1">
            <div class="text-xs font-semibold muted uppercase tracking-wider">Chiffre d’affaires (CA)</div>
            <div class="text-2xl font-extrabold tracking-tight">{{ kpiCa() | number:'1.0-0' }} TND</div>
            <div class="text-xs text-emerald-500 font-medium">Indicateur synthétique (démo)</div>
          </div>
        </tf-card>
        <tf-card>
          <div class="flex flex-col gap-1">
            <div class="text-xs font-semibold muted uppercase tracking-wider">Recettes encaissées</div>
            <div class="text-2xl font-extrabold tracking-tight">{{ kpiRecettes() | number:'1.0-0' }} TND</div>
            <div class="text-xs text-blue-500 font-medium">Basé sur factures payées (période en cours)</div>
          </div>
        </tf-card>
        <tf-card>
          <div class="flex flex-col gap-1">
            <div class="text-xs font-semibold muted uppercase tracking-wider">DSO (jours)</div>
            <div class="text-2xl font-extrabold tracking-tight">{{ kpiDso() }}</div>
            <div class="text-xs muted font-medium">Délai moyen de recouvrement (estimation)</div>
          </div>
        </tf-card>
      </section>

      <!-- IA & Prédictions -->
      <section>
        <div class="flex items-center gap-2 mb-4">
          <span class="text-lg">✨</span>
          <h2 class="text-lg font-bold" style="color: var(--tf-on-surface);">IA & Prédictions</h2>
        </div>
        <div *ngIf="mlLoading()" class="text-sm muted text-center py-4">
          <span class="animate-pulse">Chargement des indicateurs ML…</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <a
            routerLink="/ml/risk"
            class="group rounded-2xl border border-white/5 bg-[#1e2937] p-5 transition hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Risque paiement</p>
                <p class="text-3xl font-black mt-2" [style.color]="riskColor()">{{ riskScoreDisplay() }}</p>
                <p class="text-sm font-semibold mt-1" [style.color]="riskColor()">{{ riskLevelLabel() }}</p>
              </div>
              <span class="text-slate-500 group-hover:text-blue-400 transition text-xl">→</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-3">Score moyen sur factures du mois (échantillon)</p>
          </a>

          <a
            routerLink="/ml/segmentation"
            class="group rounded-2xl border border-white/5 bg-[#1e2937] p-5 transition hover:border-blue-500/40 hover:shadow-lg"
          >
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Segmentation clients</p>
            <p class="text-sm text-slate-200 mt-3 line-clamp-3">{{ segmentSummary() }}</p>
            <p class="text-[11px] text-slate-500 mt-3">Répartition RFM (K-Means)</p>
            <span class="inline-block mt-2 text-blue-400 text-xs font-bold group-hover:underline">Ouvrir →</span>
          </a>

          <a
            routerLink="/ml/cashflow"
            class="group rounded-2xl border border-white/5 bg-[#1e2937] p-5 transition hover:border-blue-500/40 hover:shadow-lg"
          >
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Trésorerie (30 j.)</p>
            <p class="text-3xl font-black text-blue-400 mt-2">{{ cashflow30Display() }}</p>
            <p class="text-xs text-slate-500 mt-1">Prophet · prévision encaissements</p>
            <span class="inline-block mt-3 text-blue-400 text-xs font-bold">Détails →</span>
          </a>


        </div>
      </section>

      <!-- Prévision détaillée (aperçu) -->
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <tf-card class="lg:col-span-2">
          <div class="font-bold mb-2" style="color: var(--tf-on-surface);">Aperçu trésorerie (Prophet)</div>
          <p *ngIf="forecastError()" class="text-sm text-rose-500">{{ forecastError() }}</p>
          <div *ngIf="!forecast() && !forecastError()" class="h-[200px] rounded-xl tf-skeleton"></div>
          <ng-container *ngIf="forecast() as fc">
            <div
              class="rounded-xl border p-4 mb-4"
              style="border-color: var(--tf-border); background: var(--tf-surface-2);"
            >
              <h3 class="text-sm font-bold">Total prévu (fenêtre modèle)</h3>
              <p class="total text-2xl font-black mt-1 text-blue-500">
                {{ fc.total_revenue | number:'1.0-0' }} TND
              </p>
              <span
                [class.text-green-600]="fc.trend_pct > 0"
                [class.text-red-600]="fc.trend_pct <= 0"
                class="text-sm font-semibold"
              >
                {{ fc.trend_direction }} {{ fc.trend_pct }}%
              </span>
            </div>
            <div class="h-[200px] w-full" *ngIf="chartPoints() as pts">
              <svg
                class="w-full h-full"
                [attr.viewBox]="'0 0 ' + chartW + ' ' + chartH"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="fcGradDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgb(59 130 246 / 0.35)" />
                    <stop offset="100%" stop-color="rgb(59 130 246 / 0)" />
                  </linearGradient>
                </defs>
                <polyline *ngIf="pts.area" [attr.points]="pts.area" fill="url(#fcGradDash)" stroke="none" />
                <polyline
                  *ngIf="pts.line"
                  [attr.points]="pts.line"
                  fill="none"
                  stroke="rgb(59 130 246)"
                  stroke-width="2"
                  vector-effect="non-scaling-stroke"
                />
              </svg>
              <div class="flex justify-between text-[10px] muted mt-1 px-1 flex-wrap gap-1">
                <span *ngFor="let m of fc.monthly_forecast">{{ m.label }}</span>
              </div>
            </div>
          </ng-container>
        </tf-card>
        <tf-card>
          <div class="font-bold mb-4" style="color: var(--tf-on-surface);">Raccourcis ML</div>
          <div class="flex flex-col gap-2">
            <a
              routerLink="/ml/risk"
              class="text-sm font-semibold text-blue-500 hover:text-blue-400 py-2 px-3 rounded-lg bg-slate-800/50 border border-white/5"
              >Risque paiement</a
            >
            <a
              routerLink="/ml/segmentation"
              class="text-sm font-semibold text-blue-500 hover:text-blue-400 py-2 px-3 rounded-lg bg-slate-800/50 border border-white/5"
              >Segmentation</a
            >
            <a
              routerLink="/ml/cashflow"
              class="text-sm font-semibold text-blue-500 hover:text-blue-400 py-2 px-3 rounded-lg bg-slate-800/50 border border-white/5"
              >Trésorerie</a
            >

          </div>
        </tf-card>
      </section>

      <tf-card>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold" style="color: var(--tf-on-surface);">Factures récentes</h3>
            <span class="text-xs muted">Dernières activités</span>
          </div>
          <a routerLink="/invoices" class="text-xs font-bold text-primary-500 hover:underline">Voir tout</a>
        </div>
        <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <tf-table [columns]="invoiceColumns" [data]="invoiceData()"></tf-table>
        </div>
      </tf-card>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private ml = inject(MlService);
  private mlAnalytics = inject(MlAnalyticsService);
  private invoicesApi = inject(InvoicesService);
  private businessSelection = inject(BusinessSelectionService);

  forecast = signal<CashflowForecastResponse | null>(null);
  forecastError = signal<string | null>(null);
  mlSnap = signal<DashboardMlSnapshot | null>(null);
  mlLoading = signal(false);

  readonly chartW = 400;
  readonly chartH = 200;

  kpiCa = signal(0);
  kpiRecettes = signal(0);
  kpiDso = signal(0);

  chartPoints = computed(() => {
    const fc = this.forecast();
    if (!fc?.monthly_forecast?.length) return null;
    const vals = fc.monthly_forecast.map((m) => m.revenue);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 1);
    const pad = 8;
    const w = this.chartW - pad * 2;
    const h = this.chartH - pad * 2;
    const n = vals.length;
    const toX = (i: number) => pad + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
    const toY = (v: number) => pad + h - ((v - min) / (max - min || 1)) * h;
    const linePts = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
    const baseY = pad + h;
    const area =
      `${pad},${baseY} ` +
      vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' ') +
      ` ${pad + w},${baseY}`;
    return { line: linePts, area };
  });

  riskScoreDisplay = computed(() => {
    const s = this.mlSnap()?.riskAvgScore;
    return s != null ? String(s) : '—';
  });

  riskLevelLabel = computed(() => {
    const w = this.mlSnap()?.riskWorstLevel;
    if (!w) return 'En attente';
    if (w === 'HIGH') return 'Risque élevé';
    if (w === 'MEDIUM') return 'Risque modéré';
    return 'Risque faible';
  });

  riskColor = computed(() => {
    const w = this.mlSnap()?.riskWorstLevel;
    if (!w) return '#94a3b8';
    return riskLevelColor(w);
  });

  segmentSummary = computed(() => {
    const c = this.mlSnap()?.segmentCounts || {};
    const parts = Object.keys(c).map((k) => `${k}: ${c[k]}`);
    return parts.length ? parts.join(' · ') : 'Segments ML non encore calculés';
  });

  cashflow30Display = computed(() => {
    const v = this.mlSnap()?.cashflow30dTnd;
    if (v == null) return '—';
    return `${Math.round(v)} TND`;
  });

  anomalyCount = computed(() => this.mlSnap()?.anomaliesThisMonth ?? 0);

  invoiceColumns = [
    { key: 'client', label: 'Client' },
    { key: 'amount', label: 'Montant' },
    { key: 'status', label: 'Statut' },
    { key: 'issuedAt', label: 'Émise le' },
  ];
  invoiceData = signal<any[]>([]);

  constructor() {
    effect(() => {
      const businessId = this.businessSelection.selectedBusinessId();
      if (this.auth.isAuthenticated()) {
        this.loadData(businessId);
      }
    });
  }

  ngOnInit(): void {
    // === DEBUG localStorage ===
    console.log('=== [Dashboard] DEBUG localStorage ===');
    const token = localStorage.getItem('token') || localStorage.getItem('taskflow-token');
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const tenantId = localStorage.getItem('tenantId');
    const activeTenantId = localStorage.getItem('activeTenantId');
    
    console.log('✅ token   :', token ? `${token.substring(0, 20)}...` : '❌ MISSING');
    console.log('✅ userId  :', userId || '❌ MISSING');
    console.log('✅ userRole:', userRole || '❌ MISSING');
    console.log('✅ tenantId:', tenantId || '❌ MISSING');
    console.log('✅ activeTenantId:', activeTenantId || '❌ MISSING');
    console.log('=== [Dashboard] END DEBUG ===');

    if (!this.auth.isAuthenticated()) {
      console.warn('[Dashboard] Not authenticated, redirecting to login...');
      this.router.navigate(['/login']);
      return;
    }
  }

  private useFallbackForecast() {
    console.warn('[Dashboard] Using fallback simulated forecast data.');
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    const monthly_forecast = [];
    let total = 0;

    for (let i = 1; i <= 6; i++) {
      const d = new Date(now);
      d.setMonth(now.getMonth() + i);
      const revenue = 12000 + Math.random() * 5000;
      total += revenue;
      monthly_forecast.push({
        month: i,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        revenue: revenue,
        lower: revenue * 0.8,
        upper: revenue * 1.2
      });
    }

    this.forecast.set({
      historical: [],
      monthly_forecast,
      total_revenue: total,
      trend_pct: 12,
      trend_direction: '↑',
      data_source: 'Simulation (Service ML indisponible)'
    });
    this.forecastError.set(null);

    // Also update mlSnap if it's not set
    if (!this.mlSnap()) {
      this.mlSnap.set({
        riskAvgScore: 12,
        riskWorstLevel: 'LOW',
        segmentCounts: { 'Champions': 5, 'Fidèles': 12, 'À Risque': 3 },
        cashflow30dTnd: monthly_forecast[0].revenue,
        cashflowTrendPct: 12,
        anomaliesThisMonth: 0,
        forecast: null
      });
    }
  }

  private loadData(businessId: string) {
    this.ml.getCashflowForecast(6).subscribe({
      next: (data) => {
        if (data && data.monthly_forecast && data.monthly_forecast.length > 0) {
          this.forecast.set(data);
          this.forecastError.set(null);
        } else {
          this.useFallbackForecast();
        }
      },
      error: () => {
        this.useFallbackForecast();
      },
    });

    if (businessId) {
      this.mlLoading.set(true);
      const tid = localStorage.getItem('activeTenantId') || '';
      
      this.invoicesApi.listByBusiness(businessId, tid).subscribe((list: any[]) => {
        const sorted = (list || []).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        const recent = sorted.slice(0, 5).map(inv => ({
          client: inv.client?.name || '---',
          amount: `${inv.totalAmount.toLocaleString()} TND`,
          status: inv.status,
          issuedAt: new Date(inv.issueDate).toLocaleDateString()
        }));
        this.invoiceData.set(recent);

        // Update KPIs
        const totalCA = list.reduce((s, i) => s + i.totalAmount, 0);
        const totalPaid = list.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0);
        this.kpiCa.set(totalCA);
        this.kpiRecettes.set(totalPaid);
        this.kpiDso.set(30); // Placeholder
      });

      this.mlAnalytics.loadDashboardSnapshot(businessId).subscribe({
        next: (snap) => {
          this.mlSnap.set(snap);
          this.mlLoading.set(false);
        },
        error: (err) => {
          console.error('[Dashboard] Error loading snapshot:', err);
          this.mlLoading.set(false);
        },
      });
    } else {
      this.mlSnap.set(null);
      this.invoiceData.set([]);
    }
  }
}
