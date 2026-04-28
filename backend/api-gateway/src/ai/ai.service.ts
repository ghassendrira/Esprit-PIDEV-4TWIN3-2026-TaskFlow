import { BadRequestException, Injectable } from '@nestjs/common';
import { EXPENSE_CLASSIFICATION_DATASET } from './expense-classification.dataset';
import { LabeledExample, ModelSnapshot, PredictionResult } from './ai.types';
import {
  InvoiceDelayExample,
  InvoiceDelayFeatures,
  InvoiceDelayModelSnapshot,
  InvoiceDelayPredictionResult,
  InvoiceDelayRiskModel,
} from './invoice-delay.model';
import { INVOICE_DELAY_DATASET } from './invoice-delay.dataset';
import { NaiveBayesTextModel } from './naive-bayes-text.model';

interface InvoiceDelayPredictionRequest extends Partial<InvoiceDelayFeatures> {
  businessId?: string;
  clientId?: string;
}

interface InvoicePaymentRecord {
  paymentDate?: string | Date;
  amount?: number;
}

interface InvoiceRecord {
  id: string;
  businessId: string;
  clientId: string;
  status?: string;
  issueDate?: string | Date;
  dueDate?: string | Date;
  totalAmount?: number;
  createdAt?: string | Date;
  payments?: InvoicePaymentRecord[];
}

@Injectable()
export class AiService {
  private readonly model = new NaiveBayesTextModel();
  private readonly invoiceDelayModel = new InvoiceDelayRiskModel();
  private snapshot: ModelSnapshot;
  private invoiceDelaySnapshot: InvoiceDelayModelSnapshot;
  private invoiceDelayExamples: ReadonlyArray<InvoiceDelayExample>;

  constructor() {
    this.snapshot = this.trainInternal(EXPENSE_CLASSIFICATION_DATASET);
    this.invoiceDelayExamples = INVOICE_DELAY_DATASET;
    this.invoiceDelaySnapshot = this.trainInvoiceDelayInternal(INVOICE_DELAY_DATASET);
  }

  getModelSnapshot(): ModelSnapshot {
    return this.snapshot;
  }

  predict(text: string): PredictionResult {
    const input = text.trim();
    if (!input) {
      throw new BadRequestException('text is required');
    }

    return this.model.predict(input);
  }

  retrain(examples?: LabeledExample[]): ModelSnapshot {
    const dataset = examples?.length ? examples : EXPENSE_CLASSIFICATION_DATASET;
    if (dataset.length === 0) {
      throw new BadRequestException('Training dataset cannot be empty');
    }

    this.snapshot = this.trainInternal(dataset);
    return this.snapshot;
  }

  getTrainingExamples(): ReadonlyArray<LabeledExample> {
    return EXPENSE_CLASSIFICATION_DATASET;
  }

  getInvoiceDelayModelSnapshot(): InvoiceDelayModelSnapshot {
    return this.invoiceDelaySnapshot;
  }

  getInvoiceDelayTrainingExamples(): ReadonlyArray<InvoiceDelayExample> {
    return this.invoiceDelayExamples;
  }

  getInvoiceDelaySnapshot(): InvoiceDelayModelSnapshot {
    return this.invoiceDelaySnapshot;
  }

  async predictInvoiceDelay(
    request: InvoiceDelayPredictionRequest,
  ): Promise<InvoiceDelayPredictionResult> {
    const dbFeatures = await this.tryBuildPredictionFeaturesFromDb(request);
    const normalized = this.normalizeInvoiceDelayFeatures(dbFeatures ?? request);
    return this.invoiceDelayModel.predict(normalized);
  }

  async retrainInvoiceDelay(params?: {
    examples?: InvoiceDelayExample[];
    businessId?: string;
  }): Promise<InvoiceDelayModelSnapshot> {
    const dataset =
      params?.examples?.length
        ? params.examples
        : (await this.tryBuildTrainingDatasetFromDb(params?.businessId)) ??
          INVOICE_DELAY_DATASET;
    if (dataset.length === 0) {
      throw new BadRequestException('Training dataset cannot be empty');
    }

    this.invoiceDelayExamples = dataset;
    this.invoiceDelaySnapshot = this.trainInvoiceDelayInternal(dataset);
    return this.invoiceDelaySnapshot;
  }

  private trainInternal(dataset: LabeledExample[]): ModelSnapshot {
    this.model.train(dataset);
    const trainingAccuracy = this.model.evaluate(dataset);
    return this.model.snapshot(trainingAccuracy);
  }

  private trainInvoiceDelayInternal(dataset: InvoiceDelayExample[]): InvoiceDelayModelSnapshot {
    this.invoiceDelayModel.train(dataset);
    const trainingAccuracy = this.invoiceDelayModel.evaluate(dataset);
    return this.invoiceDelayModel.snapshot(trainingAccuracy);
  }

  private async tryBuildTrainingDatasetFromDb(
    businessId?: string,
  ): Promise<InvoiceDelayExample[] | null> {
    const normalizedBusinessId = String(businessId ?? '').trim();
    if (!normalizedBusinessId) return null;

    const invoices = await this.fetchInvoicesByBusiness(normalizedBusinessId);
    const dbDataset = this.buildInvoiceDelayDatasetFromInvoices(invoices);
    return [...INVOICE_DELAY_DATASET, ...dbDataset];
  }

  private async tryBuildPredictionFeaturesFromDb(
    request: InvoiceDelayPredictionRequest,
  ): Promise<InvoiceDelayFeatures | null> {
    const businessId = String(request.businessId ?? '').trim();
    const clientId = String(request.clientId ?? '').trim();
    if (!businessId || !clientId) return null;

    const invoices = await this.fetchInvoicesByBusiness(businessId);
    const dbDataset = this.buildInvoiceDelayDatasetFromInvoices(invoices);
    const dataset = [...INVOICE_DELAY_DATASET, ...dbDataset];
    
    if (dbDataset.length) {
      this.invoiceDelayExamples = dataset;
      this.invoiceDelaySnapshot = this.trainInvoiceDelayInternal(dataset);
    }

    return this.buildPredictionFeaturesFromInvoices(invoices, clientId, request);
  }

  private async fetchInvoicesByBusiness(businessId: string): Promise<InvoiceRecord[]> {
    const url = `http://127.0.0.1:3005/invoices/by-business/${encodeURIComponent(businessId)}`;
    let response: globalThis.Response;

    try {
      response = await fetch(url, { method: 'GET' });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Could not load invoices from database: ${detail}`);
    }

    const text = await response.text();
    if (!response.ok) {
      throw new BadRequestException(
        `Could not load invoices from database (${response.status}): ${text || response.statusText}`,
      );
    }

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? (parsed as InvoiceRecord[]) : [];
    } catch {
      throw new BadRequestException('Invoice service returned invalid JSON');
    }
  }

  private buildInvoiceDelayDatasetFromInvoices(invoices: InvoiceRecord[]): InvoiceDelayExample[] {
    const grouped = new Map<string, InvoiceRecord[]>();
    for (const invoice of invoices) {
      if (!invoice?.clientId || !invoice?.businessId || this.isCanceled(invoice)) continue;
      const key = `${invoice.businessId}:${invoice.clientId}`;
      const current = grouped.get(key) ?? [];
      current.push(invoice);
      grouped.set(key, current);
    }

    const dataset: InvoiceDelayExample[] = [];
    for (const clientInvoices of grouped.values()) {
      const sorted = [...clientInvoices].sort(
        (left, right) => this.dateValue(left.issueDate) - this.dateValue(right.issueDate),
      );

      for (let index = 0; index < sorted.length; index += 1) {
        const invoice = sorted[index];
        const lateOutcome = this.getInvoiceLateOutcome(invoice);
        if (lateOutcome === null) continue;

        const history = sorted.slice(0, index);
        dataset.push({
          features: this.summarizeClientHistory(history, {
            amount: invoice.totalAmount,
            dueDays: this.computeDueDays(invoice),
            referenceDate: invoice.issueDate,
          }),
          late: lateOutcome,
        });
      }
    }

    return dataset;
  }

  private buildPredictionFeaturesFromInvoices(
    invoices: InvoiceRecord[],
    clientId: string,
    request: InvoiceDelayPredictionRequest,
  ): InvoiceDelayFeatures {
    const clientInvoices = invoices.filter(
      (invoice) => invoice.clientId === clientId && !this.isCanceled(invoice),
    );
    return this.summarizeClientHistory(clientInvoices, {
      amount: request.amount,
      dueDays: request.dueDays,
      referenceDate: new Date(),
    });
  }

  private summarizeClientHistory(
    invoices: InvoiceRecord[],
    options: {
      amount?: number;
      dueDays?: number;
      referenceDate?: string | Date;
    },
  ): InvoiceDelayFeatures {
    const referenceDate = this.parseDate(options.referenceDate) ?? new Date();
    const knownOutcomeInvoices = invoices.filter(
      (invoice) => this.getInvoiceLateOutcome(invoice, referenceDate) !== null,
    );
    const lateInvoices = knownOutcomeInvoices.filter(
      (invoice) => this.getInvoiceLateOutcome(invoice, referenceDate) === true,
    );
    const openInvoices = invoices.filter((invoice) => this.isOpenAt(invoice, referenceDate));
    const overdueInvoices = invoices.filter((invoice) => this.isOverdueAt(invoice, referenceDate));
    const latestInvoice = [...invoices].sort((left, right) => {
      // Prioritize createdAt (most recently added)
      const leftCreated = this.dateValue(left.createdAt);
      const rightCreated = this.dateValue(right.createdAt);
      if (leftCreated !== rightCreated) return rightCreated - leftCreated;

      // Fallback to issueDate
      return this.dateValue(right.issueDate) - this.dateValue(left.issueDate);
    })[0];

    return {
      amount: Number(options.amount ?? latestInvoice?.totalAmount ?? 0),
      dueDays: Number(options.dueDays ?? this.computeDueDays(latestInvoice) ?? 30),
      clientLateRatio: knownOutcomeInvoices.length
        ? lateInvoices.length / knownOutcomeInvoices.length
        : 0,
      previousLateCount: lateInvoices.length,
      openInvoiceCount: openInvoices.length,
      overdueInvoiceCount: overdueInvoices.length,
    };
  }

  private getInvoiceLateOutcome(
    invoice: InvoiceRecord | undefined,
    referenceDate?: string | Date,
  ): boolean | null {
    if (!invoice || this.isCanceled(invoice)) return null;

    const dueTime = this.dateValue(invoice.dueDate);
    if (!dueTime) return null;

    const paymentTime = this.firstPaymentTime(invoice);
    if (paymentTime) {
      return paymentTime > dueTime;
    }

    const status = this.normalizeInvoiceStatus(invoice.status);
    if (status === 'OVERDUE') return true;

    const now = this.dateValue(referenceDate ?? new Date());
    if (status === 'PAID') return false;
    if (dueTime < now) return true;
    return null;
  }

  private isOpenAt(invoice: InvoiceRecord | undefined, referenceDate: Date): boolean {
    if (!invoice || this.isCanceled(invoice)) return false;
    const issueTime = this.dateValue(invoice.issueDate);
    const referenceTime = referenceDate.getTime();
    if (issueTime > referenceTime) return false;

    const paymentTime = this.firstPaymentTime(invoice);
    return !paymentTime || paymentTime > referenceTime;
  }

  private isOverdueAt(invoice: InvoiceRecord | undefined, referenceDate: Date): boolean {
    if (!this.isOpenAt(invoice, referenceDate)) return false;
    const dueTime = this.dateValue(invoice?.dueDate);
    return !!dueTime && dueTime < referenceDate.getTime();
  }

  private firstPaymentTime(invoice: InvoiceRecord | undefined): number {
    const paymentTimes = (invoice?.payments ?? [])
      .map((payment) => this.dateValue(payment?.paymentDate))
      .filter((value) => value > 0);
    if (!paymentTimes.length) return 0;
    return Math.min(...paymentTimes);
  }

  private computeDueDays(invoice: InvoiceRecord | undefined): number {
    const issueTime = this.dateValue(invoice?.issueDate);
    const dueTime = this.dateValue(invoice?.dueDate);
    if (!issueTime || !dueTime) return 30;
    return Math.max(0, Math.round((dueTime - issueTime) / 86400000));
  }

  private normalizeInvoiceStatus(status: unknown): string {
    return String(status ?? '').trim().toUpperCase();
  }

  private isCanceled(invoice: InvoiceRecord | undefined): boolean {
    const status = this.normalizeInvoiceStatus(invoice?.status);
    return status === 'CANCELED' || status === 'CANCELLED';
  }

  private parseDate(value: unknown): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private dateValue(value: unknown): number {
    return this.parseDate(value)?.getTime() ?? 0;
  }

  private normalizeInvoiceDelayFeatures(features: Partial<InvoiceDelayFeatures>): InvoiceDelayFeatures {
    const amount = Number(features.amount);
    const dueDays = Number(features.dueDays);
    const clientLateRatio = Number(features.clientLateRatio);
    const previousLateCount = Number(features.previousLateCount);
    const openInvoiceCount = Number(features.openInvoiceCount);
    const overdueInvoiceCount = Number(features.overdueInvoiceCount ?? 0);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    if (!Number.isFinite(dueDays) || dueDays < 0) {
      throw new BadRequestException('dueDays must be a positive number');
    }
    if (!Number.isFinite(clientLateRatio) || clientLateRatio < 0 || clientLateRatio > 1) {
      throw new BadRequestException('clientLateRatio must be between 0 and 1');
    }
    if (!Number.isFinite(previousLateCount) || previousLateCount < 0) {
      throw new BadRequestException('previousLateCount must be a positive number');
    }
    if (!Number.isFinite(openInvoiceCount) || openInvoiceCount < 0) {
      throw new BadRequestException('openInvoiceCount must be a positive number');
    }
    if (!Number.isFinite(overdueInvoiceCount) || overdueInvoiceCount < 0) {
      throw new BadRequestException('overdueInvoiceCount must be a positive number');
    }

    return {
      amount,
      dueDays,
      clientLateRatio,
      previousLateCount,
      openInvoiceCount,
      overdueInvoiceCount,
    };
  }
}
