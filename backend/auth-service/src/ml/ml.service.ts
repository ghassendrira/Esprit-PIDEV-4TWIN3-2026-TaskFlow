import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

@Injectable()
export class MlService {
  private readonly authApiUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  private readonly mlApiUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  constructor() {}

  private async callService(url: string, options: any = {}): Promise<any> {
    try {
      const response: AxiosResponse = await axios({
        url,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        data: options.body,
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error calling ${url}:`, message);
      return null;
    }
  }

  private authHeaders(tenantId: string, authorization: string) {
    const headers: Record<string, string> = {
      Authorization: authorization,
    };
    if (tenantId) headers['X-Tenant-Id'] = tenantId;
    return headers;
  }

  async getCashflow(
    businessId: string,
    tenantId: string,
    authorization: string,
    months = 6,
  ) {
    // Get historical invoice data from invoice service
    const invoices = await this.callService(`${this.authApiUrl}/invoices/by-business/${businessId}`, {
      headers: this.authHeaders(tenantId, authorization),
    });

    if (!invoices || !Array.isArray(invoices)) {
      return this.getMockCashflow(months);
    }

    // Filter only PAID invoices for cashflow
    const paidInvoices = invoices.filter(inv => (inv.status || '').toUpperCase() === 'PAID');

    if (paidInvoices.length === 0) {
      return this.getMockCashflow(months);
    }

    // Group by month
    const monthlyMap: { [key: string]: number } = {};
    paidInvoices.forEach(inv => {
      const date = new Date(inv.createdAt || inv.issueDate);
      if (isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + Number(inv.totalTTC || inv.totalAmount || 0);
    });

    const sortedKeys = Object.keys(monthlyMap).sort();
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    // Calculate averages
    const values = Object.values(monthlyMap);
    const avgMonthly = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const last3Months = sortedKeys.slice(-3);
    const avgLast3 = last3Months.length > 0
      ? last3Months.reduce((sum, key) => sum + (monthlyMap[key] || 0), 0) / last3Months.length
      : avgMonthly;

    const trendPct = avgMonthly > 0 ? Math.round(((avgLast3 - avgMonthly) / avgMonthly) * 100) : 0;

    const historical = sortedKeys.slice(-6).map(key => {
      const [year, month] = key.split('-');
      return {
        label: `${monthNames[parseInt(month) - 1]} ${year}`,
        revenue: Math.round(monthlyMap[key]),
      };
    });

    // Generate forecast
    const forecast = Array.from({ length: months }, (_, i) => ({
      month: i + 1,
      label: `Month ${i + 1}`,
      revenue: Math.round(avgLast3 + (i * (avgLast3 * 0.05))), // 5% growth assumption
      lower: Math.round(avgLast3 * 0.8 + (i * (avgLast3 * 0.04))),
      upper: Math.round(avgLast3 * 1.2 + (i * (avgLast3 * 0.06))),
    }));

    const totalForecast = forecast.reduce((sum, f) => sum + f.revenue, 0);

    return {
      historical,
      monthly_forecast: forecast,
      total_revenue: totalForecast,
      avg_monthly: Math.round(avgLast3),
      trend_pct: trendPct,
      trend_direction: trendPct >= 0 ? '↑' : '↓',
      data_source: paidInvoices.length > 0 ? 'PostgreSQL (PAID)' : 'PostgreSQL (ALL)',
    };
  }

  private getMockCashflow(months: number) {
    return {
      historical: [
        { label: 'Jan 2024', revenue: 15000 },
        { label: 'Fév 2024', revenue: 18000 },
        { label: 'Mar 2024', revenue: 22000 },
        { label: 'Avr 2024', revenue: 19000 },
        { label: 'Mai 2024', revenue: 25000 },
        { label: 'Jun 2024', revenue: 28000 },
      ],
      monthly_forecast: Array.from({ length: months }, (_, i) => ({
        month: i + 1,
        label: `Month ${i + 1}`,
        revenue: Math.round(25000 + (i * 1000)),
        lower: Math.round(20000 + (i * 800)),
        upper: Math.round(30000 + (i * 1200)),
      })),
      total_revenue: months * 25000,
      trend_pct: 15,
      trend_direction: '↑',
      data_source: 'Mock Data',
    };
  }

  async getSegmentation(businessId: string, tenantId: string, authorization: string) {
    const clients = await this.callService(`${this.authApiUrl}/clients/by-business/${businessId}`, {
      headers: this.authHeaders(tenantId, authorization),
    });

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return { segments: { champion: 0, fidele: 0, aRisque: 0, perdus: 0 }, clients: [] };
    }

    const allInvoices = await this.callService(`${this.authApiUrl}/invoices/by-business/${businessId}`, {
      headers: this.authHeaders(tenantId, authorization),
    }) || [];

    const now = new Date();
    const clientsWithRFM = clients.map(client => {
      const clientInvoices = Array.isArray(allInvoices) ? allInvoices.filter(inv => inv.clientId === client.id) : [];

      const invoiceDates = clientInvoices
        .map(i => new Date(i.createdAt || i.issueDate).getTime())
        .filter(t => !isNaN(t));

      const lastInvoiceDate = invoiceDates.length > 0
        ? new Date(Math.max(...invoiceDates))
        : null;

      const recency = lastInvoiceDate ? Math.floor((now.getTime() - lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24)) : 9999;
      const frequency = clientInvoices.length;
      const monetary = clientInvoices.reduce((sum, inv) => sum + (Number(inv.totalTTC || inv.totalAmount || 0)), 0);

      return {
        id: client.id,
        name: client.name || client.nom || 'Client',
        email: client.email,
        recency,
        frequency,
        monetary,
        lastInvoice: lastInvoiceDate?.toISOString() || null,
      };
    });

    const segmented = clientsWithRFM.map(client => {
      let segmentId: number; let label: string; let color: string; let emoji: string; let action: string;
      const { recency, frequency, monetary } = client;

      // RFM criteria
      if (recency <= 30 && frequency >= 3 && monetary > 500) {
        segmentId = 0; label = 'Champion'; color = 'green'; emoji = '⭐'; action = 'Offrir avantages premium';
      } else if (recency <= 90 && frequency >= 2) {
        segmentId = 1; label = 'Fidèle'; color = 'blue'; emoji = '💙'; action = 'Maintenir la relation';
      } else if (recency <= 180) {
        segmentId = 2; label = 'À Risque'; color = 'orange'; emoji = '⚠️'; action = 'Relance commerciale urgente';
      } else {
        segmentId = 3; label = 'Perdu'; color = 'red'; emoji = '❌'; action = 'Campagne de réactivation';
      }

      const segLabels = ['champion', 'fidele', 'aRisque', 'perdu'];

      return {
        ...client,
        segment_id: segLabels[segmentId],
        segment_label: label,
        color,
        emoji,
        action,
        monetary: Math.round(monetary)
      };
    });

    return {
      segments: {
        champion: segmented.filter(c => c.segment_label === 'Champion').length,
        fidele: segmented.filter(c => c.segment_label === 'Fidèle').length,
        aRisque: segmented.filter(c => c.segment_label === 'À Risque').length,
        perdus: segmented.filter(c => c.segment_label === 'Perdu').length,
      },
      clients: segmented
    };
  }

  async getAnomalies(businessId: string, tenantId: string, authorization: string) {
    // Use the dedicated FastAPI ML service for advanced anomaly detection
    const mlResult = await this.callService(`${this.mlApiUrl}/ml/anomalies`, {
      method: 'GET',
      headers: {
        'x-tenant-id': tenantId,
        'x-business-id': businessId,
        'Authorization': authorization
      }
    });

    if (mlResult && mlResult.summary) {
      return mlResult;
    }

    // Fallback if ML service is unavailable: return empty structure
    return {
      summary: {
        totalInvoices: 0, invoiceAnomalies: 0, invoiceNormal: 0, invoiceAnomalyRate: 0,
        totalExpenses: 0, expenseAnomalies: 0, expenseNormal: 0, expenseAnomalyRate: 0,
        totalAnomalies: 0, totalNormal: 0
      },
      invoices: { anomalyCount: 0, normalCount: 0, anomalies: [], normal: [] },
      expenses: { anomalyCount: 0, normalCount: 0, anomalies: [], normal: [] }
    };
  }

  async getInvoiceRisk(
    businessId: string,
    tenantId: string,
    authorization: string,
    invoiceId: string,
  ) {
    const invoices = await this.callService(`${this.authApiUrl}/invoices/by-business/${businessId}`, {
      headers: this.authHeaders(tenantId, authorization),
    });

    if (!invoices || !Array.isArray(invoices)) {
      return { invoiceId, riskLevel: 'UNKNOWN', riskScore: 0, message: 'Données indisponibles' };
    }

    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
      return { invoiceId, riskLevel: 'UNKNOWN', riskScore: 0, message: 'Facture introuvable' };
    }

    let riskScore = 0.2; let riskLevel = 'LOW'; let riskEmoji = '🟢';
    const status = (invoice.status || '').toUpperCase();

    if (status === 'OVERDUE') {
      riskScore = 0.85; riskLevel = 'HIGH'; riskEmoji = '🔴';
    } else if (status === 'SENT' || status === 'PENDING') {
      const dueDateStr = invoice.dueDate || invoice.dateEcheance;
      const dueDate = dueDateStr ? new Date(dueDateStr) : null;
      if (dueDate && !isNaN(dueDate.getTime())) {
        const daysLeft = Math.floor((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) { riskScore = 0.85; riskLevel = 'HIGH'; riskEmoji = '🔴'; }
        else if (daysLeft <= 30) { riskScore = 0.60; riskLevel = 'MEDIUM'; riskEmoji = '🟡'; }
      }
    } else if (status === 'PAID') {
      riskScore = 0.05; riskLevel = 'LOW'; riskEmoji = '🟢';
    }

    return {
      invoiceId,
      riskScore,
      riskLevel,
      riskEmoji,
      riskPct: Math.round(riskScore * 100),
      message: riskLevel === 'HIGH' ? '🔴 Risque élevé' : riskLevel === 'MEDIUM' ? '🟡 Risque modéré' : '🟢 Risque faible'
    };
  }

  async getAllRisks(businessId: string, tenantId: string, authorization: string) {
    const invoices = await this.callService(`${this.authApiUrl}/invoices/by-business/${businessId}`, {
      headers: this.authHeaders(tenantId, authorization),
    });

    if (!invoices || !Array.isArray(invoices)) {
      return { stats: { total: 0, high: 0, medium: 0, low: 0 }, invoices: [] };
    }

    const risks = await Promise.all(
      invoices.map((inv) => this.getInvoiceRisk(businessId, tenantId, authorization, inv.id)),
    );

    return {
      stats: {
        total: risks.length,
        high: risks.filter(r => r.riskLevel === 'HIGH').length,
        medium: risks.filter(r => r.riskLevel === 'MEDIUM').length,
        low: risks.filter(r => r.riskLevel === 'LOW').length,
      },
      invoices: invoices.map((inv, i) => ({ ...inv, ...risks[i] }))
    };
  }

  async segmentSingleClient(clientId: string, body: { recency: number; frequency: number; monetary: number; business_id: string }) {
    // Try to call FastAPI ML service first
    const mlResult = await this.callService(`${this.mlApiUrl}/segment/client`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        recency: body.recency,
        frequency: body.frequency,
        monetary: body.monetary
      })
    });

    if (mlResult) {
      const segLabels = ['champion', 'fidele', 'aRisque', 'perdu'];
      return {
        ...mlResult,
        segment: segLabels[mlResult.segment_id] || 'fidele'
      };
    }

    // Fallback heuristic if FastAPI unavailable
    const { recency, frequency, monetary } = body;
    let segmentId: number; let label: string; let color: string; let emoji: string; let action: string;

    if (recency <= 30 && frequency >= 3 && monetary > 500) {
      segmentId = 0; label = 'Champion'; color = 'green'; emoji = '⭐'; action = 'Offrir avantages premium';
    } else if (recency <= 90 && frequency >= 2) {
      segmentId = 1; label = 'Fidèle'; color = 'blue'; emoji = '💙'; action = 'Maintenir la relation';
    } else if (recency <= 180) {
      segmentId = 2; label = 'À Risque'; color = 'orange'; emoji = '⚠️'; action = 'Relance commerciale urgente';
    } else {
      segmentId = 3; label = 'Perdu'; color = 'red'; emoji = '❌'; action = 'Campagne de réactivation';
    }

    const segLabels = ['champion', 'fidele', 'aRisque', 'perdu'];

    return {
      client_id: clientId,
      segment: segLabels[segmentId],
      segment_id: segmentId,
      segment_label: label,
      color,
      emoji,
      action
    };
  }

  async categorizeExpense(description: string) {
    const desc = description.toLowerCase();
    let category = 'Divers';
    if (desc.includes('taxi') || desc.includes('uber') || desc.includes('vol') || desc.includes('train')) category = 'Transport';
    else if (desc.includes('resto') || desc.includes('déjeuner') || desc.includes('repas')) category = 'Repas';
    else if (desc.includes('internet') || desc.includes('cloud') || desc.includes('logiciel')) category = 'Technologie';
    else if (desc.includes('loyer') || desc.includes('électricité') || desc.includes('eau')) category = 'Charges fixes';
    return {
      suggested_category: category,
      confidence: 0.9,
      auto_apply: true,
      message: `Suggestion IA : Catégorie "${category}" détectée.`
    };
  }
}