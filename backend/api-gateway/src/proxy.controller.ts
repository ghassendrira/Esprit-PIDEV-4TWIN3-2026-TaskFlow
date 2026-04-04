import {
  Body,
  Controller,
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
  private getHeaders(req: Request, extra: Record<string, string> = {}) {
    const headers: Record<string, string> = {
      Authorization: (req.headers['authorization'] as string) ?? '',
      ...extra,
    };
    
    const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    if (tenantId) {
      headers['x-tenant-id'] = tenantId as string;
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
