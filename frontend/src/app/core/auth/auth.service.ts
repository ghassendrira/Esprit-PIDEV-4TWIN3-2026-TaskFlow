import { Injectable, signal } from '@angular/core';
import { LoginResponse, AuthState } from './auth.types';

const STORAGE_KEY = 'taskflow_auth';

function loadState(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, mustChangePassword: false, platformRole: null, activeCompanyId: null };
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed.accessToken ?? null,
      mustChangePassword: Boolean(parsed.mustChangePassword),
      platformRole: parsed.platformRole ?? null,
      activeCompanyId: parsed.activeCompanyId ?? null,
    };
  } catch {
    return { accessToken: null, mustChangePassword: false, platformRole: null, activeCompanyId: null };
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly state = signal<AuthState>(loadState());

  setLogin(res: LoginResponse) {
    const next: AuthState = {
      accessToken: res.accessToken,
      mustChangePassword: res.mustChangePassword,
      platformRole: res.platformRole,
      activeCompanyId: res.activeCompanyId,
    };
    this.state.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  clear() {
    const next: AuthState = { accessToken: null, mustChangePassword: false, platformRole: null, activeCompanyId: null };
    this.state.set(next);
    localStorage.removeItem(STORAGE_KEY);
  }

  setActiveCompany(companyId: string | null) {
    const current = this.state();
    const next: AuthState = { ...current, activeCompanyId: companyId };
    this.state.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}
