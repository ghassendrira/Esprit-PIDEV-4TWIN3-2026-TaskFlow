import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MlService {
  private readonly mlUrl: string;

  constructor(private readonly config: ConfigService) {
    this.mlUrl =
      this.config.get<string>('ML_SERVICE_URL') ?? 'http://localhost:8000';
  }

  async segmentClient(
    clientId: string,
    recency: number,
    frequency: number,
    monetary: number,
  ) {
    const res = await axios.post(`${this.mlUrl}/segment/client`, {
      client_id: clientId,
      recency,
      frequency,
      monetary,
    });
    return res.data;
  }

  async categorizeExpense(description: string) {
    const res = await axios.post(`${this.mlUrl}/categorize/expense`, {
      description,
    });
    return res.data;
  }

  async getCashflowForecast(months = 6) {
    const res = await axios.get(`${this.mlUrl}/forecast/cashflow`, {
      params: { months },
    });
    return res.data;
  }

  async detectAnomaly(invoiceData: Record<string, unknown>) {
    const res = await axios.post(`${this.mlUrl}/detect/anomaly`, invoiceData);
    return res.data;
  }
}
