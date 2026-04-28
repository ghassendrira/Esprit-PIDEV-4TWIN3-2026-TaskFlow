import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MlService {
  private http = inject(HttpClient);
  private API = environment.apiUrl;

  private getHeaders() {
    return {
      'x-user-id': localStorage.getItem('userId')?.split(',')[0].trim() || '',
      'x-user-role': localStorage.getItem('userRole')?.split(',')[0].trim() || '',
      'x-tenant-id': localStorage.getItem('tenantId')?.split(',')[0].trim() || '',
    };
  }

  // 1. Risque paiement par facture
  getInvoiceRisk(invoiceId: string, invoiceData: any) {
    return this.http.post(
      `${this.API}/ml/risk/${invoiceId}`,
      invoiceData,
      { headers: this.getHeaders() }
    );
  }

  // 1b. Tous les risques factures
  getAllRisks() {
    return this.http.get<any>(
      `${this.API}/ml/risk`,
      { headers: this.getHeaders() }
    );
  }

  // 2. Segmentation tous les clients
  getClientsSegmentation() {
    return this.http.get<any>(
      `${this.API}/ml/segmentation`,
      { headers: this.getHeaders() }
    );
  }

  // 2b. Segmentation un client
  segmentClient(clientId: string, recency: number, frequency: number, monetary: number, businessId: string) {
    return this.http.post<SegmentClientResponse>(
      `${this.API}/ml/segmentation/${clientId}`,
      { recency, frequency, monetary, business_id: businessId },
      { headers: this.getHeaders() }
    );
  }

  // 3. Prévision trésorerie
  getCashflowForecast(months = 6) {
    return this.http.get<CashflowForecastResponse>(
      `${this.API}/ml/cashflow`,
      {
        headers: this.getHeaders(),
        params: { months: months.toString() }
      }
    );
  }

  // 4. Anomalies toutes les factures
  getAnomalies() {
    return this.http.get<AnomalyResponse[]>(
      `${this.API}/ml/anomalies`,
      { headers: this.getHeaders() }
    );
  }

  // 5. Catégorisation NLP expense
  categorizeExpense(description: string) {
    return this.http.post<CategorizeExpenseResponse>(
      `${this.API}/ml/categorize`,
      { description },
      { headers: this.getHeaders() }
    );
  }
}

export interface AnomalyResponse {
  invoice_id: string;
  is_anomaly: boolean;
  anomaly_score: number;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

export interface ForecastItem {
  month: number;
  label: string;
  revenue: number;
  lower: number;
  upper: number;
}

export interface CashflowForecastResponse {
  historical: { label: string; revenue: number }[];
  monthly_forecast: ForecastItem[];
  total_revenue: number;
  avg_monthly?: number;
  trend_pct: number;
  trend_direction: string;
  data_source?: string;
}

export interface SegmentClientResponse {
  client_id: string;
  segment: number;
  segment_label: string;
  color?: string;
  emoji?: string;
  action?: string;
}

export interface CategorizeExpenseResponse {
  suggested_category: string;
  confidence: number;
  auto_apply: boolean;
  message?: string;
}
