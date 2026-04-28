import { HttpInterceptorFn } from '@angular/common/http';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip interceptor for external APIs (RAG chatbot, etc.)
  if (!req.url.startsWith('/') && !req.url.includes('localhost:3')) {
    return next(req);
  }

  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');
  const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('activeTenantId') || localStorage.getItem('businessTenantId');

  // Skip adding headers for login/signup to avoid preflight/CORS issues if not needed
  if (req.url.includes('/auth/signin') || req.url.includes('/auth/signup')) {
    return next(req);
  }

  // Ensure headers are strings and not null
  const headers: any = {};
  if (userId) headers['x-user-id'] = userId;
  if (userRole) headers['x-user-role'] = userRole;
  if (tenantId) headers['x-tenant-id'] = tenantId;

  const cloned = req.clone({
    setHeaders: headers
  });

  return next(cloned);
};
