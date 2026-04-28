import { Injectable, inject } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  MlService,
  AnomalyResponse,
  CashflowForecastResponse,
  SegmentClientResponse,
} from './ml.service';
import { InvoicesService } from './invoices.service';
import { ClientsService, ClientDto } from './clients.service';
import { BusinessSelectionService } from './business-selection.service';
import {
  buildInvoiceAnomalyPayload,
  countInvoicesPerClient,
} from '../utils/ml-invoice-payload.util';
import { anomalyToPaymentRisk } from '../utils/ml-risk.util';

export type InvoiceMlRow = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  status: string;
  issueDate: string;
  anomaly: AnomalyResponse;
  riskScore: number;
  riskProbability: number;
  riskLabel: string;
  riskLevel: string;
};

export type DashboardMlSnapshot = {
  riskAvgScore: number | null;
  riskWorstLevel: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  segmentCounts: Record<string, number>;
  cashflow30dTnd: number | null;
  cashflowTrendPct: number | null;
  anomaliesThisMonth: number;
  forecast: CashflowForecastResponse | null;
};

@Injectable({ providedIn: 'root' })
export class MlAnalyticsService {
  private ml = inject(MlService);
  private invoicesApi = inject(InvoicesService);
  private clientsApi = inject(ClientsService);
  private businessSelection = inject(BusinessSelectionService);

  private resolveTenantId(): string {
    return (
      this.businessSelection.selectedTenantId() ||
      localStorage.getItem('activeTenantId') ||
      ''
    );
  }

  computeRfm(clientId: string, invoices: any[]) {
    const skip = (s: string) => {
      const u = (s || '').toUpperCase();
      return u === 'CANCELED' || u === 'CANCELLED';
    };
    const relevant = invoices.filter((i) => i.clientId === clientId && !skip(i.status));
    const paid = relevant.filter((i) => (i.status || '').toUpperCase() === 'PAID');
    const use = paid.length ? paid : relevant;
    if (!use.length) return { recency: 365, frequency: 0, monetary: 0 };
    const last = use.reduce((acc, i) => Math.max(acc, new Date(i.issueDate).getTime()), 0);
    const recency = Math.max(0, (Date.now() - last) / (1000 * 60 * 60 * 24));
    const frequency = use.length;
    const monetary = use.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    return { recency, frequency, monetary };
  }

  loadDashboardSnapshot(businessId: string): Observable<DashboardMlSnapshot> {
    const tenantId = this.resolveTenantId();
    return forkJoin({
      forecast: this.ml
        .getCashflowForecast(6)
        .pipe(catchError(() => of(null))),
      invoices: this.invoicesApi
        .listByBusiness(businessId, tenantId || undefined)
        .pipe(catchError(() => of([]))),
      clients: this.clientsApi
        .listByBusiness(businessId, tenantId || undefined)
        .pipe(catchError(() => of([]))),
    }).pipe(
      switchMap(({ forecast, invoices, clients }) => {
        const invList = Array.isArray(invoices) ? invoices : [];
        const clientList = Array.isArray(clients) ? clients : [];
        const counts = countInvoicesPerClient(invList);
        const now = new Date();
        const thisMonthInv = invList.filter((i) => {
          const d = new Date(i.issueDate);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        const sample = thisMonthInv.slice(0, 12);
        const cashflow30d = forecast?.monthly_forecast?.[0]?.revenue ?? null;

        const riskCalls = sample.map((inv) =>
          this.ml
            .getInvoiceRisk(inv.id, buildInvoiceAnomalyPayload(inv, counts.get(inv.clientId) || 1))
            .pipe(catchError(() => of(null))),
        );

        const segmentCalls = clientList.slice(0, 40).map((c) => {
          const rfm = this.computeRfm(c.id, invList);
          return this.ml
            .segmentClient(c.id, rfm.recency, rfm.frequency, rfm.monetary, businessId)
            .pipe(catchError(() => of(null)));
        });

        return forkJoin({
          risks: riskCalls.length ? forkJoin(riskCalls) : of([]),
          segments: segmentCalls.length ? forkJoin(segmentCalls) : of([]),
        }).pipe(
          map(({ risks, segments }) => {
            const validRisks = (risks as (AnomalyResponse | null)[]).filter(
              (r): r is AnomalyResponse => !!r,
            );
            const risksMapped = validRisks.map((r) => anomalyToPaymentRisk(r));
            const avg =
              risksMapped.length > 0
                ? Math.round(
                    risksMapped.reduce((s, x) => s + x.score, 0) / risksMapped.length,
                  )
                : null;
            const worst: 'HIGH' | 'MEDIUM' | 'LOW' | null = validRisks.some(
              (r) => r.risk_level === 'HIGH',
            )
              ? 'HIGH'
              : validRisks.some((r) => r.risk_level === 'MEDIUM')
                ? 'MEDIUM'
                : validRisks.length
                  ? 'LOW'
                  : null;
            const anomaliesThisMonth = validRisks.filter((r) => r.is_anomaly).length;

            const segmentCounts: Record<string, number> = {};
            (segments as (SegmentClientResponse | null)[]).forEach((r) => {
              if (!r) return;
              const k = r.segment_label || '—';
              segmentCounts[k] = (segmentCounts[k] || 0) + 1;
            });

            return {
              riskAvgScore: avg,
              riskWorstLevel: worst,
              segmentCounts,
              cashflow30dTnd: cashflow30d,
              cashflowTrendPct: forecast?.trend_pct ?? null,
              anomaliesThisMonth,
              forecast,
            } satisfies DashboardMlSnapshot;
          }),
        );
      }),
    );
  }

  loadInvoicesWithRisk(businessId: string): Observable<InvoiceMlRow[]> {
    const tenantId = this.resolveTenantId();
    return this.invoicesApi.listByBusiness(businessId, tenantId || undefined).pipe(
      switchMap((invoices) => {
        const list = Array.isArray(invoices) ? invoices : [];
        const counts = countInvoicesPerClient(list);
        if (!list.length) return of([]);
        return forkJoin(
          list.map((inv) =>
            this.ml
              .getInvoiceRisk(inv.id, buildInvoiceAnomalyPayload(inv, counts.get(inv.clientId) || 1))
              .pipe(catchError(() => of(null))),
          ),
        ).pipe(
          map((results) => {
            return list.map((inv, i) => {
              const raw = results[i] as AnomalyResponse | null;
              const fallback: AnomalyResponse = {
                invoice_id: inv.id,
                is_anomaly: false,
                anomaly_score: 0,
                risk_level: 'LOW',
                message: '',
              };
              const a = raw || fallback;
              const pr = anomalyToPaymentRisk(a);
              return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                clientName: inv.client?.name || '—',
                totalAmount: Number(inv.totalAmount) || 0,
                status: inv.status,
                issueDate: inv.issueDate,
                anomaly: a,
                riskScore: pr.score,
                riskProbability: pr.probability,
                riskLabel: pr.label,
                riskLevel: pr.level,
              } satisfies InvoiceMlRow;
            });
          }),
        );
      }),
    );
  }
}
