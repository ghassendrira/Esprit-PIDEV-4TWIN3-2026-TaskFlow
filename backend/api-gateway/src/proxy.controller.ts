import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
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

    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    const userId = req.header('x-user-id') || req.header('X-User-Id');
    if (userId) headers['x-user-id'] = userId;

    const userRole = req.header('x-user-role') || req.header('X-User-Role');
    if (userRole) headers['x-user-role'] = userRole;

    // If multi-tenant headers are missing, try to extract from JWT
    if (authorization && (!headers['x-tenant-id'] || !headers['x-user-id'] || !headers['x-user-role'])) {
      try {
        const token = authorization.replace('Bearer ', '');
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        if (!headers['x-tenant-id'] && payload.tenantId) headers['x-tenant-id'] = payload.tenantId;
        if (!headers['x-user-id'] && payload.sub) headers['x-user-id'] = payload.sub;
        if (!headers['x-user-role'] && payload.roles?.[0]) headers['x-user-role'] = payload.roles[0];
      } catch {}
    }

    return headers;
  }

  @Get('tenant/countries')
  async getCountries(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/tenant/countries';
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
    const url = 'http://localhost:3001/business/categories';
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
    const url = 'http://localhost:3001/tenant/all';
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
    const url = 'http://localhost:3001/tenant/current';
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
    const url = 'http://localhost:3001/tenant/request';
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
    const url = 'http://localhost:3001/tenant/update';
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
    const url = 'http://localhost:3001/business/list';
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
    const url = 'http://localhost:3001/business/create';
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
    const url = `http://localhost:3001/business/${encodeURIComponent(id)}/update`;
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
    const url = `http://localhost:3001/clients/by-business/${encodeURIComponent(businessId)}`;
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
    const url = 'http://localhost:3001/clients';
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
    const url = `http://localhost:3001/clients/${encodeURIComponent(id)}`;
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
    const url = `http://localhost:3001/clients/${encodeURIComponent(id)}`;
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
    const url = `http://localhost:3001/clients/${encodeURIComponent(id)}`;
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
    const url = `http://localhost:3001/invoices/by-business/${encodeURIComponent(businessId)}`;
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
    const url = 'http://localhost:3001/invoices';
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

  @Post('invoices/report/unpaid')
  async generateUnpaidReport(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3005/invoices/report/unpaid';
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

  @Get('invoices/:id')
  async getInvoice(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3001/invoices/${encodeURIComponent(id)}`;
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

  @Post('invoices/:id/send')
  async sendInvoice(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3005/invoices/${encodeURIComponent(id)}/send`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Post('invoices/:id/smart-send')
  async smartSendInvoice(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3005/invoices/${encodeURIComponent(id)}/smart-send`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
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
    const url = `http://localhost:3001/invoices/${encodeURIComponent(id)}`;
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
    const url = `http://localhost:3001/invoices/${encodeURIComponent(id)}`;
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

  @Get('expenses/categories')
  async listExpenseCategories(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3006/expense-categories';
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

  @Post('expense-categories')
  async createExpenseCategory(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3006/expense-categories';
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

  @Get('expenses')
  async listAllExpenses(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3006/expenses';
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

  @Get('expenses/:id')
  async getExpense(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3006/expenses/${encodeURIComponent(id)}`;
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

  @Get('expenses/by-business')
  async listExpensesByBusinessHeader(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3006/expenses/by-business';
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

  @Get('expenses/by-business/:businessId')
  async listExpensesByBusiness(
    @Param('businessId') businessId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3006/expenses/by-business/${encodeURIComponent(businessId)}`;
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
    const url = 'http://localhost:3006/expenses';
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

  @Patch('expenses/:id')
  async updateExpense(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3006/expenses/${encodeURIComponent(id)}`;
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

  @Delete('expenses/:id')
  async deleteExpense(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3006/expenses/${encodeURIComponent(id)}`;
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

  @Patch('expenses/:id/approve')
  async approveExpense(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3006/expenses/${encodeURIComponent(id)}/approve`;
    try {
      const r = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(req),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Patch('expenses/:id/reject')
  async rejectExpense(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3006/expenses/${encodeURIComponent(id)}/reject`;
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

  // ─── CHAT (Team + Support) → notification-service:3004 ───

  @Get('chat/team/:businessId/messages')
  async chatTeamMessages(
    @Param('businessId') businessId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const qs = req.url.split('?')[1] || '';
    const url = `http://localhost:3004/chat/team/${encodeURIComponent(businessId)}/messages${qs ? '?' + qs : ''}`;
    try {
      const r = await fetch(url, { method: 'GET', headers: this.getHeaders(req) });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('chat/team/:businessId/messages')
  async chatTeamSend(
    @Param('businessId') businessId: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3004/chat/team/${encodeURIComponent(businessId)}/messages`;
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

  @Get('chat/team/:businessId/room')
  async chatTeamRoom(
    @Param('businessId') businessId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3004/chat/team/${encodeURIComponent(businessId)}/room`;
    try {
      const r = await fetch(url, { method: 'GET', headers: this.getHeaders(req) });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('chat/team/:businessId/questions')
  async chatTeamQuestions(
    @Param('businessId') businessId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3004/chat/team/${encodeURIComponent(businessId)}/questions`;
    try {
      const r = await fetch(url, { method: 'GET', headers: this.getHeaders(req) });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('chat/team/:businessId/questions/:questionCode/ask')
  async chatTeamAskQuestion(
    @Param('businessId') businessId: string,
    @Param('questionCode') questionCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3004/chat/team/${encodeURIComponent(businessId)}/questions/${encodeURIComponent(questionCode)}/ask`;
    try {
      const r = await fetch(url, { method: 'POST', headers: this.getHeaders(req) });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('chat/support/rooms')
  async chatSupportRooms(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3004/chat/support/rooms';
    try {
      const r = await fetch(url, { method: 'GET', headers: this.getHeaders(req) });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('chat/support/:businessId/init')
  async chatSupportInit(
    @Param('businessId') businessId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3004/chat/support/${encodeURIComponent(businessId)}/init`;
    try {
      const r = await fetch(url, { method: 'POST', headers: this.getHeaders(req) });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('chat/support/:roomId/messages')
  async chatSupportMessages(
    @Param('roomId') roomId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const qs = req.url.split('?')[1] || '';
    const url = `http://localhost:3004/chat/support/${encodeURIComponent(roomId)}/messages${qs ? '?' + qs : ''}`;
    try {
      const r = await fetch(url, { method: 'GET', headers: this.getHeaders(req) });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('chat/support/:roomId/messages')
  async chatSupportSend(
    @Param('roomId') roomId: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3004/chat/support/${encodeURIComponent(roomId)}/messages`;
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

  @Post('chat/support/:roomId/read')
  async chatSupportMarkRead(
    @Param('roomId') roomId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3004/chat/support/${encodeURIComponent(roomId)}/read`;
    try {
      const r = await fetch(url, { method: 'POST', headers: this.getHeaders(req) });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('chat/support/:roomId/unread')
  async chatSupportUnread(
    @Param('roomId') roomId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3004/chat/support/${encodeURIComponent(roomId)}/unread`;
    try {
      const r = await fetch(url, { method: 'GET', headers: this.getHeaders(req) });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }
}
