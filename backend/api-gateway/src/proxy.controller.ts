import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

@Controller()
export class ProxyController {
  private firstHeaderValue(value: string | string[] | undefined): string | undefined {
    if (!value) return undefined;
    return Array.isArray(value) ? value[0] : value;
  }

  private getHeaders(req: Request, extra: Record<string, string> = {}) {
    const headers: Record<string, string> = { ...extra };

    const authorization = this.firstHeaderValue(req.headers['authorization']);
    if (authorization) headers['Authorization'] = authorization;

    const tenantId =
      req.header('x-tenant-id') ??
      req.header('X-Tenant-Id') ??
      this.firstHeaderValue(req.headers['x-tenant-id']);

    if (tenantId) headers['x-tenant-id'] = tenantId;

    return headers;
  }

  private async fetchJson<T>(
    url: string,
    init?: RequestInit,
    errorMessage = 'Upstream request failed',
  ): Promise<T> {
    let response: globalThis.Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`${errorMessage}: ${detail}`);
    }

    const text = await response.text();
    if (!response.ok) {
      throw new BadRequestException(
        `${errorMessage} (${response.status}): ${text || response.statusText}`,
      );
    }

    if (!text) {
      return [] as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BadRequestException(`${errorMessage}: invalid JSON response`);
    }
  }

  private normalizeInvoiceStatus(status: unknown): string {
    const value = String(status ?? '').trim().toUpperCase();
    if (!value) return 'UNKNOWN';
    if (['PAID', 'PAYE', 'PAYÉ'].includes(value)) return 'PAID';
    if (['PENDING', 'UNPAID', 'AWAITING_PAYMENT', 'EN ATTENTE'].includes(value)) {
      return 'PENDING';
    }
    if (['OVERDUE', 'LATE', 'EN RETARD'].includes(value)) return 'OVERDUE';
    if (['DRAFT', 'BROUILLON'].includes(value)) return 'DRAFT';
    if (['CANCELLED', 'CANCELED', 'ANNULE', 'ANNULÉ'].includes(value)) return 'CANCELLED';
    return value;
  }

  private normalizeExpenseStatus(status: unknown): string {
    const value = String(status ?? '').trim().toUpperCase();
    if (!value) return 'UNKNOWN';
    if (['APPROVED', 'VALIDATED', 'APPROUVE', 'APPROUVÉ', 'PAID'].includes(value)) {
      return 'APPROVED';
    }
    if (['PENDING', 'SUBMITTED', 'EN ATTENTE'].includes(value)) return 'PENDING';
    if (['REJECTED', 'REFUSED', 'REJETE', 'REJETÉ'].includes(value)) return 'REJECTED';
    return value;
  }

  private isInvoicePaid(status: unknown): boolean {
    return this.normalizeInvoiceStatus(status) === 'PAID';
  }

  private isInvoiceOverdue(invoice: any): boolean {
    if (this.isInvoicePaid(invoice?.status)) return false;
    const normalized = this.normalizeInvoiceStatus(invoice?.status);
    if (normalized === 'OVERDUE') return true;
    const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
    return !!dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
  }

  private countByLabel(values: string[]): Array<{ label: string; count: number }> {
    const counts = new Map<string, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  private toTimestamp(value: unknown): number {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(String(value));
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  private sumNumbers(values: Array<number | null | undefined>): number {
    return values.reduce<number>(
      (sum, value) => sum + (Number.isFinite(value) ? Number(value) : 0),
      0,
    );
  }

  @Get('tenant/countries')
  async getCountries(@Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3001/tenant/countries';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('business/categories')
  async getCategories(@Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3001/business/categories';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('tenant/all')
  async getAllTenants(@Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3001/tenant/all';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('tenant/current')
  async getCurrentTenant(@Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3001/tenant/current';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('tenant/request')
  async requestTenant(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3001/tenant/request';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Patch('tenant/update')
  async updateTenant(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3001/tenant/update';
    try {
      const r = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('business/list')
  async listBusinesses(@Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3001/business/list';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('business/create')
  async createBusiness(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3001/business/create';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Patch('business/:id/update')
  async updateBusiness(@Param('id') id: string, @Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = `http://127.0.0.1:3001/business/${encodeURIComponent(id)}/update`;
    try {
      const r = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('clients/by-business/:businessId')
  async listClientsByBusiness(
    @Param('businessId') businessId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://127.0.0.1:3001/clients/by-business/${encodeURIComponent(businessId)}`;
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('clients')
  async createClient(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3001/clients';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('clients/:id')
  async getClient(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://127.0.0.1:3001/clients/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Patch('clients/:id')
  async updateClient(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://127.0.0.1:3001/clients/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Delete('clients/:id')
  async deleteClient(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://127.0.0.1:3001/clients/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('invoices/by-business/:businessId')
  async listInvoicesByBusiness(
    @Param('businessId') businessId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://127.0.0.1:3005/invoices/by-business/${encodeURIComponent(businessId)}`;
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Post('invoices')
  async createInvoice(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3005/invoices';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', r.headers.get('content-type') ?? 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Patch('invoices/:id')
  async updateInvoice(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://127.0.0.1:3005/invoices/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', r.headers.get('content-type') ?? 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Delete('invoices/:id')
  async deleteInvoice(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://127.0.0.1:3005/invoices/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Post('ocr/invoice')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async ocrInvoice(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');

    const apiKey = process.env.MINDEE_API_KEY?.trim();
    if (!apiKey) throw new BadRequestException('MINDEE_API_KEY is not configured');

    const isV2Key = apiKey.startsWith('md_');

    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || 'application/octet-stream',
    });

    const stringOrEmpty = (v: unknown) => (v === undefined || v === null ? '' : String(v));
    const numberOrNull = (v: unknown) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    if (!isV2Key) {
      // Mindee V1 legacy endpoint (sync).
      const endpoint =
        process.env.MINDEE_INVOICE_ENDPOINT?.trim() ||
        'https://api.mindee.net/v1/products/mindee/invoices/v4/predict';

      const form = new FormData();
      form.append('document', blob, file.originalname || 'invoice');

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
        },
        body: form,
      });

      const text = await r.text();
      if (!r.ok) {
        throw new BadRequestException(`Mindee OCR failed (${r.status}): ${text}`);
      }

      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new BadRequestException('Mindee OCR returned invalid JSON');
      }

      const prediction =
        json?.document?.inference?.prediction ||
        json?.document?.inference?.pages?.[0]?.prediction ||
        null;

      const val = (node: any) =>
        node && typeof node === 'object'
          ? (node.value ?? node.raw_value ?? node.rawValue)
          : undefined;

      const invoiceNumber = val(prediction?.invoice_number);
      const issueDate = val(prediction?.date) || val(prediction?.invoice_date);
      const dueDate = val(prediction?.due_date);
      const totalAmount = val(prediction?.total_amount);
      const taxAmount =
        val(prediction?.total_tax) ??
        val(prediction?.total_vat) ??
        (Array.isArray(prediction?.taxes)
          ? prediction.taxes.reduce(
              (sum: number, t: any) =>
                sum + (Number(val(t?.value) ?? val(t?.amount) ?? 0) || 0),
              0,
            )
          : undefined);
      const currency = val(prediction?.currency);
      const supplierName = val(prediction?.supplier_name) || val(prediction?.supplier);

      return {
        invoiceNumber: stringOrEmpty(invoiceNumber),
        issueDate: stringOrEmpty(issueDate),
        dueDate: stringOrEmpty(dueDate),
        totalAmount: numberOrNull(totalAmount),
        taxAmount: numberOrNull(taxAmount),
        currency: stringOrEmpty(currency),
        supplierName: stringOrEmpty(supplierName),
        raw: prediction,
      };
    }

    // Mindee V2 endpoint (async): https://api-v2.mindee.net
    const modelId = process.env.MINDEE_MODEL_ID?.trim();
    if (!modelId) {
      throw new BadRequestException(
        'MINDEE_MODEL_ID is required for Mindee V2 API keys (starts with "md_")',
      );
    }

    const enqueueUrl =
      process.env.MINDEE_INVOICE_ENDPOINT?.trim() ||
      'https://api-v2.mindee.net/v2/products/extraction/enqueue';

    const enqueueForm = new FormData();
    enqueueForm.append('model_id', modelId);
    enqueueForm.append('file', blob, file.originalname || 'invoice');

    const enqueueRes = await fetch(enqueueUrl, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
      },
      body: enqueueForm,
    });

    const enqueueText = await enqueueRes.text();
    if (!enqueueRes.ok) {
      throw new BadRequestException(`Mindee OCR failed (${enqueueRes.status}): ${enqueueText}`);
    }

    let jobJson: any;
    try {
      jobJson = JSON.parse(enqueueText);
    } catch {
      throw new BadRequestException('Mindee OCR returned invalid JSON');
    }

    const pollingUrl = jobJson?.job?.polling_url;
    if (!pollingUrl) {
      throw new BadRequestException('Mindee OCR did not return polling_url');
    }

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const started = Date.now();
    const timeoutMs = 60_000;

    let resultUrl: string | null = null;
    while (Date.now() - started < timeoutMs) {
      const pollRes = await fetch(`${pollingUrl}?redirect=false`, {
        method: 'GET',
        headers: { Authorization: apiKey },
      });
      const pollText = await pollRes.text();
      if (!pollRes.ok) {
        throw new BadRequestException(`Mindee OCR polling failed (${pollRes.status}): ${pollText}`);
      }

      let pollJson: any;
      try {
        pollJson = JSON.parse(pollText);
      } catch {
        throw new BadRequestException('Mindee OCR polling returned invalid JSON');
      }

      const status = pollJson?.job?.status;
      if (status === 'Failed') {
        throw new BadRequestException(`Mindee OCR job failed: ${JSON.stringify(pollJson?.job?.error ?? pollJson)}`);
      }
      if (status === 'Processed') {
        resultUrl = pollJson?.job?.result_url || null;
        break;
      }
      await sleep(1000);
    }

    if (!resultUrl) {
      throw new BadRequestException('Mindee OCR timed out waiting for results');
    }

    const resultRes = await fetch(resultUrl, {
      method: 'GET',
      headers: { Authorization: apiKey },
    });
    const resultText = await resultRes.text();
    if (!resultRes.ok) {
      throw new BadRequestException(`Mindee OCR result fetch failed (${resultRes.status}): ${resultText}`);
    }

    let resultJson: any;
    try {
      resultJson = JSON.parse(resultText);
    } catch {
      throw new BadRequestException('Mindee OCR result returned invalid JSON');
    }

    const fields = resultJson?.inference?.result?.fields || {};
    const fieldVal = (k: string) => fields?.[k]?.value;
    const pick = (keys: string[]) => {
      for (const k of keys) {
        const v = fieldVal(k);
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
      return undefined;
    };

    const invoiceNumber = pick(['invoice_number', 'invoiceNumber', 'invoice_id', 'invoiceId', 'number']);
    const issueDate = pick(['date', 'invoice_date', 'invoiceDate', 'issue_date', 'issueDate']);
    const dueDate = pick(['due_date', 'dueDate', 'payment_date', 'paymentDate']);
    const totalAmount = pick(['total_amount', 'totalAmount', 'amount_total', 'amountTotal', 'amount']);
    const taxAmount = pick(['total_tax', 'tax_amount', 'taxAmount', 'vat_amount', 'vatAmount']);
    const currency = pick(['currency', 'currency_code', 'currencyCode']);
    const supplierName = pick(['supplier_name', 'supplierName', 'supplier', 'vendor_name', 'vendorName']);

    return {
      invoiceNumber: stringOrEmpty(invoiceNumber),
      issueDate: stringOrEmpty(issueDate),
      dueDate: stringOrEmpty(dueDate),
      totalAmount: numberOrNull(totalAmount),
      taxAmount: numberOrNull(taxAmount),
      currency: stringOrEmpty(currency),
      supplierName: stringOrEmpty(supplierName),
      raw: { fields },
    };
  }

  @Get('expenses/by-business/:businessId')
  async listExpensesByBusiness(
    @Param('businessId') businessId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://127.0.0.1:3006/expenses/by-business/${encodeURIComponent(businessId)}`;
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Post('expenses')
  async createExpense(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://127.0.0.1:3006/expenses';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', r.headers.get('content-type') ?? 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Patch('expenses/:id')
  async updateExpense(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://127.0.0.1:3006/expenses/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', r.headers.get('content-type') ?? 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Delete('expenses/:id')
  async deleteExpense(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://127.0.0.1:3006/expenses/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Get('dashboard/admin')
  async adminDashboard(@Req() req: Request) {
    const authHeaders = this.getHeaders(req);
    const authorization = authHeaders['Authorization'];
    if (!authorization) {
      throw new BadRequestException('Authorization header is required');
    }

    const tenantServiceBase = 'http://127.0.0.1:3002';
    const businessServiceBase = 'http://127.0.0.1:3003';
    const authServiceBase = 'http://127.0.0.1:3001';

    const tenants = await this.fetchJson<any[]>(
      `${tenantServiceBase}/tenants`,
      { headers: { Authorization: authorization } },
      'Failed to load tenants',
    );
    const pendingRegistrations = await this.fetchJson<any[]>(
      `${authServiceBase}/admin/registrations`,
      { headers: { Authorization: authorization } },
      'Failed to load pending registrations',
    );
    const blockedAccounts = await this.fetchJson<any[]>(
      `${authServiceBase}/admin/blocked-accounts`,
      { headers: { Authorization: authorization } },
      'Failed to load blocked accounts',
    );
    const passwordResetRequests = await this.fetchJson<any[]>(
      `${authServiceBase}/auth/password-reset-requests`,
      { headers: { Authorization: authorization } },
      'Failed to load password reset requests',
    );

    const tenantRows = await Promise.all(
      (Array.isArray(tenants) ? tenants : []).map(async (tenant: any) => {
        const tenantId = String(tenant?.id ?? '');
        const [businesses, users] = await Promise.all([
          this.fetchJson<any[]>(
            `${businessServiceBase}/businesses/by-tenant/${encodeURIComponent(tenantId)}`,
            undefined,
            `Failed to load businesses for tenant ${tenantId}`,
          ),
          this.fetchJson<any[]>(
            `${authServiceBase}/users/list`,
            {
              headers: {
                Authorization: authorization,
                'x-tenant-id': tenantId,
              },
            },
            `Failed to load users for tenant ${tenantId}`,
          ),
        ]);

        return {
          tenantId,
          tenantName: String(tenant?.name ?? 'Unknown'),
          businesses: Array.isArray(businesses) ? businesses : [],
          users: Array.isArray(users) ? users : [],
        };
      }),
    );

    const uniqueUserIds = new Set<string>();
    const usersByRoleCounts = new Map<string, number>();
    for (const row of tenantRows) {
      for (const user of row.users) {
        const userId = String(user?.id ?? '');
        if (userId && user?.isActive !== false) uniqueUserIds.add(userId);
        const role = String(user?.role ?? 'UNKNOWN').toUpperCase();
        usersByRoleCounts.set(role, (usersByRoleCounts.get(role) ?? 0) + 1);
      }
    }

    const businessesPerTenant = tenantRows.map((row) => ({
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      businessCount: row.businesses.length,
      userCount: row.users.length,
    }));

    const recentActivity = [
      ...pendingRegistrations.map((item: any) => ({
        type: 'registration',
        title: `${item?.firstName ?? ''} ${item?.lastName ?? ''}`.trim() || item?.email || 'Pending registration',
        subtitle: item?.companyName || item?.email || '',
        status: 'PENDING',
        at: item?.createdAt ?? null,
      })),
      ...blockedAccounts.map((item: any) => ({
        type: 'blocked_account',
        title: `${item?.firstName ?? ''} ${item?.lastName ?? ''}`.trim() || item?.email || 'Blocked account',
        subtitle: item?.companyName || item?.email || '',
        status: item?.roleName || 'BLOCKED',
        at: item?.blockedUntil ?? item?.createdAt ?? null,
      })),
      ...passwordResetRequests.map((item: any) => ({
        type: 'password_reset',
        title: item?.email || item?.userEmail || 'Password reset request',
        subtitle: item?.status || 'PENDING',
        status: item?.status || 'PENDING',
        at: item?.createdAt ?? item?.updatedAt ?? null,
      })),
    ]
      .sort((a, b) => this.toTimestamp(b.at) - this.toTimestamp(a.at))
      .slice(0, 8);

    return {
      summary: {
        totalTenants: tenantRows.length,
        totalBusinesses: businessesPerTenant.reduce((sum, row) => sum + row.businessCount, 0),
        activeUsers: uniqueUserIds.size,
        blockedAccounts: Array.isArray(blockedAccounts) ? blockedAccounts.length : 0,
        pendingRegistrations: Array.isArray(pendingRegistrations) ? pendingRegistrations.length : 0,
        pendingPasswordResetRequests: (Array.isArray(passwordResetRequests) ? passwordResetRequests : []).filter(
          (item: any) => String(item?.status ?? 'PENDING').toUpperCase() === 'PENDING',
        ).length,
      },
      usersByRole: Array.from(usersByRoleCounts.entries())
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role)),
      businessesPerTenant,
      recentActivity,
    };
  }

  @Get('dashboard/business-owner')
  async businessOwnerDashboard(@Req() req: Request) {
    const headers = this.getHeaders(req);
    const authorization = headers['Authorization'];
    if (!authorization) {
      throw new BadRequestException('Authorization header is required');
    }

    const authServiceBase = 'http://127.0.0.1:3001';
    const businessServiceBase = 'http://127.0.0.1:3003';
    const invoiceServiceBase = 'http://127.0.0.1:3005';
    const expenseServiceBase = 'http://127.0.0.1:3006';

    const [businesses, employees] = await Promise.all([
      this.fetchJson<any[]>(
        `${authServiceBase}/business/list`,
        { headers },
        'Failed to load businesses',
      ),
      this.fetchJson<any[]>(
        `${authServiceBase}/users/list`,
        { headers },
        'Failed to load employees',
      ),
    ]);

    const businessRows = await Promise.all(
      (Array.isArray(businesses) ? businesses : []).map(async (business: any) => {
        const businessId = String(business?.id ?? '');
        const [clients, invoices, expenses] = await Promise.all([
          this.fetchJson<any[]>(
            `${businessServiceBase}/clients/by-business/${encodeURIComponent(businessId)}`,
            undefined,
            `Failed to load clients for business ${businessId}`,
          ),
          this.fetchJson<any[]>(
            `${invoiceServiceBase}/invoices/by-business/${encodeURIComponent(businessId)}`,
            { headers },
            `Failed to load invoices for business ${businessId}`,
          ),
          this.fetchJson<any[]>(
            `${expenseServiceBase}/expenses/by-business/${encodeURIComponent(businessId)}`,
            { headers },
            `Failed to load expenses for business ${businessId}`,
          ),
        ]);

        return {
          business,
          clients: Array.isArray(clients) ? clients : [],
          invoices: Array.isArray(invoices) ? invoices : [],
          expenses: Array.isArray(expenses) ? expenses : [],
        };
      }),
    );

    const allClients = businessRows.flatMap((row) => row.clients);
    const allInvoices = businessRows.flatMap((row) => row.invoices);
    const allExpenses = businessRows.flatMap((row) => row.expenses);
    const currency =
      String(businessRows[0]?.business?.currency ?? businesses?.[0]?.currency ?? 'TND') || 'TND';

    const totalInvoicedAmount = this.sumNumbers(
      allInvoices.map((invoice: any) => Number(invoice?.totalAmount ?? 0)),
    );
    const paidAmount = this.sumNumbers(
      allInvoices
        .filter((invoice: any) => this.isInvoicePaid(invoice?.status))
        .map((invoice: any) => Number(invoice?.totalAmount ?? 0)),
    );
    const totalExpenses = this.sumNumbers(
      allExpenses.map((expense: any) => Number(expense?.amount ?? 0)),
    );

    const clientsById = new Map<string, any>();
    for (const client of allClients) {
      clientsById.set(String(client?.id ?? ''), client);
    }

    const topClientMap = allInvoices.reduce((acc, invoice: any) => {
        const clientId = String(invoice?.clientId ?? '');
        const current = acc.get(clientId) ?? {
          clientId,
          clientName: clientsById.get(clientId)?.name ?? 'Unknown client',
          invoiceCount: 0,
          billedAmount: 0,
        };
        current.invoiceCount += 1;
        current.billedAmount += Number(invoice?.totalAmount ?? 0);
        acc.set(clientId, current);
        return acc;
      }, new Map<string, { clientId: string; clientName: string; invoiceCount: number; billedAmount: number }>());

    const topClients = Array.from<{
      clientId: string;
      clientName: string;
      invoiceCount: number;
      billedAmount: number;
    }>(topClientMap.values())
      .sort((a, b) => b.billedAmount - a.billedAmount)
      .slice(0, 5);

    const recentInvoices = [...allInvoices]
      .sort(
        (a: any, b: any) =>
          this.toTimestamp(b?.issueDate ?? b?.createdAt) - this.toTimestamp(a?.issueDate ?? a?.createdAt),
      )
      .slice(0, 5)
      .map((invoice: any) => ({
        id: String(invoice?.id ?? ''),
        invoiceNumber: String(invoice?.invoiceNumber ?? ''),
        clientName: clientsById.get(String(invoice?.clientId ?? ''))?.name ?? 'Unknown client',
        amount: Number(invoice?.totalAmount ?? 0),
        status: this.normalizeInvoiceStatus(invoice?.status),
        issueDate: invoice?.issueDate ?? invoice?.createdAt ?? null,
      }));

    const recentExpenses = [...allExpenses]
      .sort(
        (a: any, b: any) =>
          this.toTimestamp(b?.date ?? b?.createdAt) - this.toTimestamp(a?.date ?? a?.createdAt),
      )
      .slice(0, 5)
      .map((expense: any) => ({
        id: String(expense?.id ?? ''),
        description: String(expense?.description ?? 'Expense'),
        amount: Number(expense?.amount ?? 0),
        status: this.normalizeExpenseStatus(expense?.status),
        date: expense?.date ?? expense?.createdAt ?? null,
      }));

    return {
      summary: {
        businessCount: businessRows.length,
        totalInvoices: allInvoices.length,
        totalInvoicedAmount,
        paidAmount,
        outstandingAmount: Math.max(totalInvoicedAmount - paidAmount, 0),
        overdueInvoicesCount: allInvoices.filter((invoice: any) => this.isInvoiceOverdue(invoice)).length,
        totalExpenses,
        totalClients: new Set(allClients.map((client: any) => String(client?.id ?? ''))).size,
        totalEmployees: Array.isArray(employees) ? employees.length : 0,
        currency,
      },
      invoicesByStatus: this.countByLabel(
        allInvoices.map((invoice: any) => this.normalizeInvoiceStatus(invoice?.status)),
      ),
      expensesByStatus: this.countByLabel(
        allExpenses.map((expense: any) => this.normalizeExpenseStatus(expense?.status)),
      ),
      topClients,
      recentInvoices,
      recentExpenses,
    };
  }

  @Post('users/create')
  async createEmployee(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/users/create';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader(
          'Content-Type',
          r.headers.get('content-type') ?? 'application/json',
        )
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Get('users/list')
  async listEmployees(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/users/list';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Get('users/:id')
  async getEmployee(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3001/users/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('users/:id/delete')
  async deleteEmployee(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3001/users/${encodeURIComponent(id)}/delete`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('notification/welcome')
  async welcomeEmail(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3004/notification/welcome';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', r.headers.get('content-type') ?? 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Patch('onboarding/company-setup')
  async companySetup(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/onboarding/company-setup';
    try {
      const r = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Post('onboarding/company-setup')
  async companySetupPost(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/onboarding/company-setup';
    try {
      const r = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Post('onboarding/create-business')
  async createBusinessOnboarding(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/onboarding/create-business';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Get('onboarding/status')
  async onboardingStatus(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/onboarding/status';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }
}
