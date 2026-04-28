import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService, Role } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data?.['roles'] as Role[] | Role | undefined;
  if (!required) return true;
  if (auth.hasRole(required)) {
    return true;
  }
  return router.parseUrl('/dashboard');
};

