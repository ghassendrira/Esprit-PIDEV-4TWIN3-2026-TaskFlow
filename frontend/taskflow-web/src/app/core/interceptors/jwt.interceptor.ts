import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const activeTenantId = localStorage.getItem('activeTenantId');
  
  let setHeaders: any = {};
  
  if (token) {
    setHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  if (activeTenantId) {
    setHeaders['X-Tenant-Id'] = activeTenantId;
  }
  
  let obs$ = next(req);
  
  if (Object.keys(setHeaders).length > 0) {
    const cloned = req.clone({ setHeaders });
    obs$ = next(cloned);
  }

  return obs$.pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired or invalid
        auth.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};

