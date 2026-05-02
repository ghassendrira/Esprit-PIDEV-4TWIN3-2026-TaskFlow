import { HttpInterceptorFn } from '@angular/common/http';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip interceptor for external APIs (RAG chatbot, etc.)
  if (!req.url.startsWith('/') && !req.url.includes('localhost:3')) {
    return next(req);
  }

  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');
  const activeTenantId = localStorage.getItem('activeTenantId');
  const tenantId = localStorage.getItem('tenantId');
  const businessTenantId = localStorage.getItem('businessTenantId');
  const activeBusinessId = localStorage.getItem('activeBusinessId') || localStorage.getItem('businessId');
  
  // Utiliser activeTenantId en priorité, sinon tenantId
  const finalTenantId = activeTenantId || tenantId || businessTenantId;

  // Skip adding headers for login/signup to avoid preflight/CORS issues if not needed
  if (req.url.includes('/auth/signin') || req.url.includes('/auth/signup')) {
    return next(req);
  }

  // Log les valeurs pour debugging
  if (req.method === 'GET' && !req.url.includes('/assets')) {
    console.log('[TenantInterceptor]', {
      method: req.method,
      url: req.url,
      userId: userId ? userId.substring(0, 8) + '...' : 'MISSING',
      userRole: userRole || 'MISSING',
      activeTenantId: activeTenantId ? activeTenantId.substring(0, 8) + '...' : 'MISSING',
      tenantId: tenantId ? tenantId.substring(0, 8) + '...' : 'MISSING',
      finalTenantId: finalTenantId ? finalTenantId.substring(0, 8) + '...' : 'MISSING',
    });
  }

  // Ensure headers are strings and not null
  const headers: any = {};
  if (userId) headers['x-user-id'] = userId;
  if (userRole) headers['x-user-role'] = userRole;
  if (finalTenantId) headers['x-tenant-id'] = finalTenantId;
  if (activeBusinessId) headers['x-business-id'] = activeBusinessId;

  const cloned = req.clone({
    setHeaders: headers
  });

  return next(cloned);
};
