import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    const user = auth.user();
    if (user?.mustChangePassword) {
      return router.parseUrl('/change-password');
    }
    return true;
  }
  return router.parseUrl('/auth/login');
};

export const loggedInMatch: CanMatchFn = (route): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  if (!auth.isAuthenticated()) return router.parseUrl('/home');
  
  const user = auth.user();
  // If user must change password, only allow access to 'change-password' route
  if (user?.mustChangePassword && route.path !== 'change-password') {
    return router.parseUrl('/change-password');
  }
  
  return true;
};

export const guestMatch: CanMatchFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    const user = auth.user();
    if (user?.mustChangePassword) {
      return router.parseUrl('/change-password');
    }
    return router.parseUrl('/dashboard');
  }
  return true;
};
