import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { LoadingService } from './loading.service';

export type Role = 'OWNER' | 'ACCOUNTANT' | 'TEAM' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  tenantName?: string;
  mustChangePassword?: boolean;
  is2faEnabled?: boolean;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'taskflow-user';

export interface ResetPasswordDto {
  resetToken: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private router = inject(Router);
  private loading = inject(LoadingService);
  private tokenSig = signal<string | null>(localStorage.getItem(TOKEN_KEY) || localStorage.getItem('taskflow-token'));
  private userSig = signal<AuthUser | null>(this.readUser());

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  readonly isAuthenticated = computed(() => !!this.tokenSig());
  readonly roles = computed<Role[]>(() => {
    const u = this.userSig();
    if (!u) return [];
    const base = Array.isArray(u.roles) ? [...u.roles] : [];
    // TEMP: treat main admin email as SUPER_ADMIN until backend exposes roles
    if (u.email === 'nour.hasni02@gmail.com' && !base.includes('SUPER_ADMIN')) {
      base.push('SUPER_ADMIN');
    }
    return base;
  });
  readonly user = computed<AuthUser | null>(() => this.userSig());

  private readUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  token(): string | null {
    return this.tokenSig();
  }

  loginMock(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    try { localStorage.removeItem('taskflow-token'); } catch {}
    
    const decoded = this.decodeToken(token);
    if (decoded) {
      let name = decoded.name;
      if (!name && (decoded.firstName || decoded.lastName)) {
        name = `${decoded.firstName || ''} ${decoded.lastName || ''}`.trim();
      }
      
      const rawRoles = decoded.roles || [];
      const mappedRoles: Role[] = rawRoles.map((r: string) => {
        const role = r.toUpperCase();
        if (role === 'BUSINESS_OWNER' || role === 'OWNER' || role === 'PROJECT_MANAGER') return 'BUSINESS_OWNER' as Role;
        if (role === 'TEAM_MEMBER' || role === 'TEAM') return 'TEAM';
        if (role === 'SUPER_ADMIN' || role === 'SUPER_MANAGER') return 'SUPER_ADMIN';
        if (role === 'ADMIN' || role === 'NIGHT_SHIFT_LEAD') return 'ADMIN' as Role;
        return r as Role;
      });

      const user: AuthUser = {
        id: decoded.sub,
        email: decoded.email,
        name: name || 'User',
        roles: mappedRoles,
        tenantName: decoded.tenantName,
        mustChangePassword: !!decoded.mustChangePassword
      };
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      
      // Multi-tenant context for interceptor
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userRole', mappedRoles[0] || '');
      localStorage.setItem('tenantId', decoded.businessId || decoded.tenantId || '');

      if (decoded.tenantName) {
        localStorage.setItem('companyName', decoded.tenantName);
      }
      this.userSig.set(user);
    }
    this.tokenSig.set(token);
  }

  signup(payload: { firstName: string; lastName: string; email: string; companyName: string; companyCategory?: string; }) {
    return this.api.post<any>('/auth/signup', payload);
  }
  signin(payload: { email: string; password: string }) {
    return this.api.post<{ token: string; mustChangePassword: boolean }>(
      '/auth/signin',
      payload,
    );
  }

  createEmployee(payload: {
    email: string;
    firstName: string;
    lastName: string;
    role: 'ACCOUNTANT' | 'ADMIN' | 'TEAM_MEMBER';
  }) {
    return this.api.post<{ success: boolean; message: string }>(
      '/users/create',
      payload,
    );
  }

  setSecurityQuestions(payload: { question: string; answer: string }) {
    return this.api.post<{ success: boolean; message?: string; question?: any }>(
      '/auth/security-questions',
      payload,
    );
  }

  getSecurityQuestions() {
    return this.api.get<any[]>('/auth/security-questions');
  }

  getEmployees() {
    return this.api.get<any[]>('/users/list');
  }

  getEmployeesForTenant(tenantId: string) {
    let headers = new HttpHeaders();
    const token = this.token();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    if (tenantId) headers = headers.set('X-Tenant-Id', tenantId);
    return this.api.get<any[]>('/users/list', { headers });
  }

  getEmployee(id: string) {
    return this.api.get<any>(`/users/${id}`);
  }

  deleteEmployee(id: string) {
    return this.api.post<any>(`/users/${id}/delete`, {});
  }

  getRoles() {
    return this.api.get<any[]>('/roles/list');
  }

  getPermissions() {
    return this.api.get<any[]>('/roles/permissions');
  }

  assignPermissions(roleId: string, permissionIds: string[]) {
    return this.api.post<any>(`/roles/${roleId}/permissions`, { permissionIds });
  }

  forgotPassword(payload: { email: string }) {
    return this.api.post<{
      hasSecurityQuestions: boolean;
      message?: string;
      questions?: string[];
      userId?: string;
    }>('/auth/forgot-password', payload);
  }

  forgotPasswordEmail(email: string) {
    return this.api.post<{ success: boolean; message: string }>('/auth/forgot-password/email', { email });
  }

  forgotPasswordContactAdmin(email: string) {
    return this.api.post<{ success: boolean; message: string }>('/auth/forgot-password/contact-admin', { email });
  }

  getPasswordResetRequests() {
    return this.api.get<any[]>('/auth/password-reset-requests');
  }

  getBlockedAccounts() {
    return this.api.get<any[]>('/admin/blocked-accounts');
  }

  approvePasswordReset(requestId: string) {
    return this.api.post<any>(`/auth/password-reset-requests/${requestId}/approve`, {});
  }

  rejectPasswordReset(requestId: string, reason: string) {
    return this.api.post<any>(`/auth/password-reset-requests/${requestId}/reject`, { reason });
  }

  unblockAccount(userId: string) {
    return this.api.post<any>(`/admin/unblock/${userId}`, {});
  }

  verifySecurityAnswer(payload: { email: string; question: string; answer: string }) {
    return this.api.post<{ resetToken: string }>(
      '/auth/verify-security-answer',
      payload,
    );
  }

  resetPassword(payload: ResetPasswordDto) {
    return this.api.post<{ success: boolean }>('/auth/reset-password', payload);
  }

  switchTenant(tenantId: string) {
    return this.api.post<{ success: boolean; tenantId: string }>(
      `/auth/switch-tenant/${tenantId}`,
      {},
    );
  }

  changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }) {
    return this.api.post<{ token: string }>('/auth/change-password', payload);
  }

  // 2FA Methods
  generate2fa() {
    return this.api.post<{ secret: string; qrCodeDataUrl: string }>('/auth/2fa/generate', {});
  }

  enable2fa(otp: string) {
    return this.api.post<{ success: boolean }>('/auth/2fa/enable', { otp });
  }

  verify2fa(userId: string, otp: string) {
    return this.api.post<{ token: string; mustChangePassword: boolean }>('/auth/2fa/verify', { userId, otp });
  }

  logout() {
    this.loading.begin();

    setTimeout(() => {
      localStorage.removeItem(TOKEN_KEY);
      try { localStorage.removeItem('taskflow-token'); } catch {}
      localStorage.removeItem(USER_KEY);
      
      // Clear multi-tenant context
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('activeTenantId');
      localStorage.removeItem('companyName');

      this.tokenSig.set(null);
      this.userSig.set(null);

      void this.router.navigate(['/home']).finally(() => this.loading.end());
    });
  }

  hasRole(required: Role | Role[]): boolean {
    const roles = Array.isArray(required) ? required : [required];
    return roles.some(r => this.roles().includes(r));
  }
}
