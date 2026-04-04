import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { catchError, finalize, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const loading = inject(LoadingService);
  const router = inject(Router);
  const token = auth.token();
  const activeTenantId = localStorage.getItem('activeTenantId');
  
  let setHeaders: any = {};
  
  const hasAuthHeader = req.headers.has('Authorization');
  const hasTenantHeader = req.headers.has('X-Tenant-Id') || req.headers.has('x-tenant-id');

  if (token && !hasAuthHeader) {
    setHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (activeTenantId && !hasTenantHeader) {
    setHeaders['X-Tenant-Id'] = activeTenantId;
  }

  const finalReq = Object.keys(setHeaders).length > 0 ? req.clone({ setHeaders }) : req;

  loading.begin();

  return next(finalReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired or invalid
        auth.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    }),
    finalize(() => loading.end())
  );
};

