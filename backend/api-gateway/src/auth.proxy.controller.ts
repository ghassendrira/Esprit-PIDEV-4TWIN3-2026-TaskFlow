import { Body, Controller, Post, Req, Res, Get, Param } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthProxyController {
  @Post('signup')
  async signup(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/auth/signup';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const text = await r.text();
      res.status(r.status);
      const ct = r.headers.get('content-type') ?? 'application/json';
      res.setHeader('Content-Type', ct);
      res.send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res
        .status(502)
        .json({ message: 'Upstream auth-service error', error: err });
    }
  }

  @Post('signin')
  async signin(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/auth/signin';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status);
      res.setHeader(
        'Content-Type',
        r.headers.get('content-type') ?? 'application/json',
      );
      res.send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res
        .status(502)
        .json({ message: 'Upstream auth-service error', error: err });
    }
  }

  @Post('security-questions')
  async securityQuestions(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/auth/security-questions';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status);
      const ct = r.headers.get('content-type') ?? 'application/json';
      res.setHeader('Content-Type', ct);
      res.send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res
        .status(502)
        .json({ message: 'Upstream auth-service error', error: err });
    }
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/auth/forgot-password';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', r.headers.get('content-type') ?? 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream auth-service error', error: err });
    }
  }

  @Post('forgot-password/email')
  async forgotPasswordEmail(
    @Body() body: any,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/auth/forgot-password/email';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('forgot-password/contact-admin')
  async forgotPasswordContactAdmin(
    @Body() body: any,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/auth/forgot-password/contact-admin';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('password-reset-requests')
  async getPasswordResetRequests(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/auth/password-reset-requests';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('password-reset-requests/:id/approve')
  async approvePasswordReset(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3001/auth/password-reset-requests/${id}/approve`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('password-reset-requests/:id/reject')
  async rejectPasswordReset(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3001/auth/password-reset-requests/${id}/reject`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('verify-security-answer')
  async verifySecurityAnswer(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/auth/verify-security-answer';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', r.headers.get('content-type') ?? 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream auth-service error', error: err });
    }
  }

  @Get('security-questions')
  async getSecurityQuestions(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/auth/security-questions';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream auth-service error' });
    }
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/auth/reset-password';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status);
      res.setHeader(
        'Content-Type',
        r.headers.get('content-type') ?? 'application/json',
      );
      res.send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res
        .status(502)
        .json({ message: 'Upstream auth-service error', error: err });
    }
  }

  @Post('change-password')
  async changePassword(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = 'http://localhost:3001/auth/change-password';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res
        .status(r.status)
        .setHeader('Content-Type', r.headers.get('content-type') ?? 'application/json')
        .send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      res.status(502).json({ message: 'Upstream auth-service error', error: err });
    }
  }

  @Post('switch-tenant/:id')
  async switchTenant(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3001/auth/switch-tenant/${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  // 2FA Proxy
  @Post('2fa/generate')
  async generate2fa(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/auth/2fa/generate';
    console.log(`[Proxy] Forwarding 2FA generate to ${url}`);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
      });
      console.log(`[Proxy] 2FA generate response status: ${r.status}`);
      const text = await r.text();
      console.log(`[Proxy] 2FA generate response body length: ${text.length}`);
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      console.error(`[Proxy] 2FA generate error: ${err}`);
      res.status(502).json({ message: 'Upstream error', error: err });
    }
  }

  @Post('2fa/enable')
  async enable2fa(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/auth/2fa/enable';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post('2fa/verify')
  async verify2fa(@Body() body: any, @Res() res: Response) {
    const url = 'http://localhost:3001/auth/2fa/verify';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }
}

@Controller('roles')
export class RolesProxyController {
  @Post('create')
  async createRole(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/roles/create';
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('list')
  async listRoles(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/roles/list';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Get('permissions')
  async listPermissions(@Res() res: Response) {
    const url = 'http://localhost:3001/roles/permissions';
    try {
      const r = await fetch(url, { method: 'GET' });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }

  @Post(':id/permissions')
  async assignPermissions(@Param('id') id: string, @Body() body: any, @Req() req: Request, @Res() res: Response) {
    const url = `http://localhost:3001/roles/${encodeURIComponent(id)}/permissions`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (e: unknown) {
      res.status(502).json({ message: 'Upstream error' });
    }
  }
}

@Controller('admin')
export class AdminProxyController {
  @Get('registrations')
  async adminRegistrations(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/admin/registrations';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
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

  @Post('approve/:userId')
  async adminApprove(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3001/admin/approve/${encodeURIComponent(userId)}`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
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

  @Post('reject/:userId')
  async adminReject(
    @Param('userId') userId: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3001/admin/reject/${encodeURIComponent(userId)}`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
        body: JSON.stringify(body ?? {}),
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

  @Get('blocked-accounts')
  async blockedAccounts(@Req() req: Request, @Res() res: Response) {
    const url = 'http://localhost:3001/admin/blocked-accounts';
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
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

  @Post('unblock/:userId')
  async unblockAccount(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = `http://localhost:3001/admin/unblock/${encodeURIComponent(userId)}`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: (req.headers['authorization'] as string) ?? '',
        },
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
}
