import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { catchError, finalize, throwError } from 'rxjs';
import { Router } from '@angular/router';

const TOKEN_KEYS = ['token', 'taskflow-token', 'access_token'] as const;

function readToken(auth: AuthService): string {
  const t = auth.token();
  if (t && t !== 'undefined' && t !== 'null') return t;
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v && v !== 'undefined' && v !== 'null') return v;
  }
  return '';
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip interceptor for external APIs (RAG chatbot, etc.)
  if (!req.url.startsWith('/') && !req.url.includes('localhost:3')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const loading = inject(LoadingService);
  const router = inject(Router);
  const token = readToken(auth);
  const activeTenantId =
    localStorage.getItem('activeTenantId') ||
    localStorage.getItem('tenantId') ||
    localStorage.getItem('businessTenantId');
  const userId = localStorage.getItem('userId') || '';
  const rawUserRole = localStorage.getItem('userRole') || '';
  
  // NETTOYER le rôle : enlever "ROLE_" prefix
  const userRole = rawUserRole.startsWith('ROLE_')
    ? rawUserRole.replace('ROLE_', '')
    : rawUserRole;

  const setHeaders: Record<string, string> = {};

  const hasAuthHeader = req.headers.has('Authorization');
  const hasTenantHeader = req.headers.has('X-Tenant-Id') || req.headers.has('x-tenant-id');
  const hasUserIdHeader = req.headers.has('X-User-Id') || req.headers.has('x-user-id');
  const hasUserRoleHeader = req.headers.has('X-User-Role') || req.headers.has('x-user-role');

  if (isDevMode()) {
    console.debug(`[JWT-INTERCEPTOR] Processing request: ${req.method} ${req.url}`);
    console.debug(`[JWT-INTERCEPTOR] Token found: ${token ? (token.substring(0, 10) + '...') : 'NONE'}`);
    console.debug(`[JWT-INTERCEPTOR] TenantId: ${activeTenantId || 'MISSING'}`);
    console.debug(`[JWT-INTERCEPTOR] UserId: ${userId || 'MISSING'}`);
    console.debug(`[JWT-INTERCEPTOR] UserRole: ${userRole || 'MISSING'}`);
  }

  // Add Authorization header
  if (token && !hasAuthHeader) {
    if (token.includes('.') && token.split('.').length === 3) {
      setHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('[JWT-INTERCEPTOR] Blocked invalid token format from header attachment');
    }
  }

  // Récupérer tenantId - NE PAS mettre MISSING
  const rawTenantId = (
    localStorage.getItem('activeTenantId') ||
    localStorage.getItem('tenantId')       ||
    localStorage.getItem('businessId')     || ''
  ).split(',')[0]?.trim();

  // Si MISSING ou vide → ne pas envoyer
  const tenantId = (rawTenantId === 'MISSING' || 
                    !rawTenantId)
    ? ''
    : rawTenantId;

  const headers: any = {
    'x-user-id'  : userId,
    'x-user-role': userRole,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  return next(
    req.clone({ setHeaders: headers })
  ).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status === 401) {
        const currentUrl = router.url;

        // Pages protégées = pas de logout
        const protectedPages = [
          '/dashboard', '/invoices', '/expenses',
          '/clients', '/settings', '/team',
          '/employees', '/ml'
        ];

        const isProtected = protectedPages.some(
          p => currentUrl.startsWith(p)
        );

        if (isProtected) {
          // ← NE PAS LOGOUT sur page protégée
          console.warn(
            '401 on protected page:', error.url
          );
          return throwError(() => error);
        } else {
          // Logout seulement si pas sur page protégée
          console.log('[JWT] Logging out');
          auth.logout();
          void router.navigate(['/auth/login']);
        }
      }

      if (error.status === 403) {
        console.warn(
          '[JWT] Forbidden - insufficient permissions:',
          error.url
        );
        // Ne pas logout sur 403
        return throwError(() => error);
      }

      return throwError(() => error);
    }),
    finalize(() => loading.end()),
  );
};

