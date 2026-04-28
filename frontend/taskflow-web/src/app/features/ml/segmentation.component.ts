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
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { MlService, SegmentClientResponse } from '../../core/services/ml.service';
import { InvoicesService } from '../../core/services/invoices.service';
import { ClientsService, ClientDto } from '../../core/services/clients.service';
import { BusinessSelectionService } from '../../core/services/business-selection.service';
import { MlAnalyticsService } from '../../core/services/ml-analytics.service';

Chart.register(...registerables);

type SegRow = {
  segment: string;
  count: number;
  pctRevenue: number;
  action: string;
  emoji: string;
};

@Component({
  selector: 'tf-segmentation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 text-slate-100">
      <header>
        <a routerLink="/dashboard" class="text-xs font-semibold text-blue-400 hover:text-blue-300 mb-2 inline-block">← Dashboard</a>
        <h1 class="text-2xl font-bold tracking-tight">Segmentation clients (RFM)</h1>
        <p class="text-sm text-slate-400 mt-1">Projection Recency / Fréquence — couleur par segment ML.</p>
      </header>

      <div *ngIf="!businessId()" class="rounded-2xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
        Sélectionnez un business pour afficher la segmentation.
      </div>

      <div *ngIf="businessId()" class="rounded-2xl border border-white/5 bg-[#1e2937] p-4 min-h-[320px]">
        <p class="text-sm font-bold text-slate-200 mb-2">Nuage RFM</p>
        <div class="h-[280px]">
          <canvas #scatterChart></canvas>
        </div>
        <p class="text-[11px] text-slate-500 mt-2">Axe X : ancienneté (jours) · Axe Y : fréquence (nb factures)</p>
      </div>

      <div class="rounded-2xl border border-white/5 bg-[#1e2937] overflow-hidden" *ngIf="businessId()">
        <div class="px-5 py-4 border-b border-white/5 flex justify-between items-center">
          <h2 class="font-bold">Synthèse par segment</h2>
          <span *ngIf="loading()" class="text-xs text-slate-500">Analyse…</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-[#0f172a] text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th class="px-4 py-3">Segment</th>
                <th class="px-4 py-3 text-right">Clients</th>
                <th class="px-4 py-3 text-right">% CA</th>
                <th class="px-4 py-3">Action recommandée</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr *ngFor="let r of tableRows()" class="hover:bg-white/5">
                <td class="px-4 py-3 font-semibold">{{ r.emoji }} {{ r.segment }}</td>
                <td class="px-4 py-3 text-right">{{ r.count }}</td>
                <td class="px-4 py-3 text-right">{{ r.pctRevenue | number:'1.1-1' }}%</td>
                <td class="px-4 py-3 text-slate-300">{{ r.action }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class SegmentationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scatterChart') scatterCanvas!: ElementRef<HTMLCanvasElement>;

  private ml = inject(MlService);
  private invoicesApi = inject(InvoicesService);
  private clientsApi = inject(ClientsService);
  private businessSelection = inject(BusinessSelectionService);
  private mlAnalytics = inject(MlAnalyticsService);

  businessId = computed(() => this.businessSelection.selectedBusinessId());
  loading = signal(false);
  private points = signal<
    { x: number; y: number; label: string; color: string }[]
  >([]);
  tableRows = signal<SegRow[]>([]);

  private chart?: Chart;

  ngAfterViewInit(): void {
    const bid = this.businessId();
    if (!bid) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const tenant =
      this.businessSelection.selectedTenantId() ||
      localStorage.getItem('activeTenantId') ||
      '';

    forkJoin({
      inv: this.invoicesApi.listByBusiness(bid, tenant || undefined).pipe(catchError(() => of([]))),
      clients: this.clientsApi.listByBusiness(bid, tenant || undefined).pipe(catchError(() => of([]))),
    })
      .pipe(
        switchMap(({ inv, clients }) => {
          const invList = Array.isArray(inv) ? inv : [];
          const clientList = Array.isArray(clients) ? clients : [];
          const calls = clientList.slice(0, 60).map((c: ClientDto) => {
            const rfm = this.mlAnalytics.computeRfm(c.id, invList);
            return this.ml
              .segmentClient(c.id, rfm.recency, rfm.frequency, rfm.monetary, bid)
              .pipe(
                map((seg) => ({ client: c, rfm, seg })),
                catchError(() => of({ client: c, rfm, seg: null as SegmentClientResponse | null })),
              );
          });
          return calls.length ? forkJoin(calls) : of([]);
        }),
      )
      .subscribe((results) => {
        const list = (
          results as {
            client: ClientDto;
            rfm: { recency: number; frequency: number; monetary: number };
            seg: SegmentClientResponse | null;
          }[]
        ).filter((x) => x.seg);
        const colorMap: Record<string, string> = {
          Champion: '#22c55e',
          Fidèle: '#3b82f6',
          'À risque': '#f97316',
          Perdu: '#ef4444',
        };
        const pts = list.map((x) => ({
          x: x.rfm.recency,
          y: x.rfm.frequency,
          label: x.seg!.segment_label,
          color: colorMap[x.seg!.segment_label] || '#94a3b8',
        }));
        this.points.set(pts);

        const bySeg = new Map<string, { count: number; monetary: number; action: string; emoji: string }>();
        let totalM = 0;
        for (const x of list) {
          const s = x.seg!;
          const k = s.segment_label;
          totalM += x.rfm.monetary;
          const cur = bySeg.get(k) || { 
            count: 0, 
            monetary: 0, 
            action: s.action || '—', 
            emoji: s.emoji || '👥' 
          };
          cur.count++;
          cur.monetary += x.rfm.monetary;
          cur.action = s.action || '—';
          cur.emoji = s.emoji || '👥';
          bySeg.set(k, cur);
        }
        const rows: SegRow[] = [];
        bySeg.forEach((v, k) => {
          rows.push({
            segment: k,
            count: v.count,
            pctRevenue: totalM > 0 ? (v.monetary / totalM) * 100 : 0,
            action: v.action,
            emoji: v.emoji,
          });
        });
        rows.sort((a, b) => b.pctRevenue - a.pctRevenue);
        this.tableRows.set(rows);
        this.loading.set(false);
        setTimeout(() => this.renderScatter(pts), 0);
      });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderScatter(
    pts: { x: number; y: number; label: string; color: string }[],
  ) {
    this.chart?.destroy();
    const canvas = this.scatterCanvas?.nativeElement;
    if (!canvas) return;

    const byLabel = new Map<string, { x: number; y: number }[]>();
    for (const p of pts) {
      const arr = byLabel.get(p.label) || [];
      arr.push({ x: p.x, y: p.y });
      byLabel.set(p.label, arr);
    }

    const datasets = Array.from(byLabel.entries()).map(([label, data]) => ({
      label,
      data,
      backgroundColor: pts.find((x) => x.label === label)?.color || '#64748b',
      pointRadius: 6,
    }));

    const cfg: ChartConfiguration<'scatter'> = {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'Récence (jours)', color: '#94a3b8' },
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#94a3b8' },
          },
          y: {
            title: { display: true, text: 'Fréquence', color: '#94a3b8' },
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#94a3b8' },
          },
        },
        plugins: {
          legend: {
            labels: { color: '#cbd5e1' },
          },
        },
      },
    };
    this.chart = new Chart(canvas, cfg);
  }
}
