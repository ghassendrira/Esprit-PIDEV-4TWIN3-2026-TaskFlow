import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.state().accessToken) {
    return router.parseUrl('/login');
  }
  return true;
};

export const mustChangePasswordGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.state().accessToken) {
    return router.parseUrl('/login');
  }

  if (auth.state().mustChangePassword && state.url !== '/change-password') {
    return router.parseUrl('/change-password');
  }

  return true;
};

export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.state().accessToken) {
    return router.parseUrl('/login');
  }
  if (auth.state().platformRole !== 'PLATFORM_ADMIN') {
    return router.parseUrl('/companies');
  }
  return true;
};
