import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { LoadingService } from './loading.service';

export type Role =
  | 'ROLE_OWNER'
  | 'ROLE_ACCOUNTANT'
  | 'ROLE_TEAM'
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_ADMIN'
  | 'ROLE_BUSINESS_OWNER';

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
    // TEMP: treat main admin email as ROLE_SUPER_ADMIN until backend exposes roles
    if (u.email === 'nour.hasni02@gmail.com' && !base.includes('ROLE_SUPER_ADMIN')) {
      base.push('ROLE_SUPER_ADMIN');
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
    if (!token || token === 'undefined' || token === 'null') {
      console.error('[AuthService] Attempted to login with invalid token value:', token);
      return;
    }

    if (!token.includes('.') || token.split('.').length !== 3) {
      console.error('[AuthService] Token format is invalid (not a JWT):', token);
      return;
    }

    console.log('[AuthService] Storing valid JWT in localStorage');
    localStorage.setItem(TOKEN_KEY, token);
    try { localStorage.removeItem('taskflow-token'); } catch {}
    
    const decoded = this.decodeToken(token);
    console.log('[AuthService] Decoded JWT:', decoded);
    if (decoded) {
      let name = decoded.name;
      if (!name && (decoded.firstName || decoded.lastName)) {
        name = `${decoded.firstName || ''} ${decoded.lastName || ''}`.trim();
      }
      
      const rawRoles = decoded.roles || [];
      const mappedRoles: Role[] = rawRoles.map((r: string) => {
        let role = r.toUpperCase();
        if (!role.startsWith('ROLE_')) {
          role = `ROLE_${role}`;
        }
        
        if (role === 'ROLE_BUSINESS_OWNER' || role === 'ROLE_OWNER' || role === 'ROLE_PROJECT_MANAGER')
          return 'ROLE_BUSINESS_OWNER' as Role;
        if (role === 'ROLE_TEAM_MEMBER' || role === 'ROLE_TEAM') return 'ROLE_TEAM';
        if (role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_SUPER_MANAGER') return 'ROLE_SUPER_ADMIN';
        if (role === 'ROLE_ADMIN' || role === 'ROLE_BUSINESS_ADMIN' || role === 'ROLE_NIGHT_SHIFT_LEAD') return 'ROLE_ADMIN';
        if (role === 'ROLE_ACCOUNTANT') return 'ROLE_ACCOUNTANT';
        return role as Role;
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

      const tid = decoded.tenantId || decoded.businessId || decoded.company_id;
      console.log('[AuthService] Step 1 - Extracted from JWT:', {
        tenantId: decoded.tenantId,
        businessId: decoded.businessId,
        company_id: decoded.company_id,
        final_tid: tid,
      });
      
      let tidStr = tid && String(tid) !== 'null' ? String(tid).split('/')[0].trim() : '';
      console.log('[AuthService] Step 2 - Cleaned tidStr:', tidStr);
      
      // IMPORTANT: Chercher d'abord dans localStorage (déjà défini par login.component)
      const existingTenantId = localStorage.getItem('tenantId');
      console.log('[AuthService] Step 3 - Existing in localStorage:', existingTenantId);
      
      if (existingTenantId && existingTenantId !== 'null' && existingTenantId !== '') {
        tidStr = existingTenantId;
        console.log('[AuthService] Step 4 - Using tenantId from localStorage:', tidStr);
      } else if (!tidStr) {
        // Fallback: use existing tenantId from localStorage if JWT doesn't have one
        console.log('[AuthService] Step 5 - No tenantId in JWT, no fallback available');
      }

      // Multi-tenant context for interceptor (X-Tenant-Id obligatoire côté API)
      console.log('[AuthService] Step 6 - Final tidStr to use:', tidStr);
      localStorage.setItem('userId', user.id);
      // Sauvegarder le rôle SANS préfixe ROLE_ pour les headers
      const cleanRole = mappedRoles[0]?.replace('ROLE_', '') || '';
      
      // Ne pas écraser userRole si déjà défini
      const existingRole = localStorage.getItem('userRole');
      if (!existingRole || existingRole !== cleanRole) {
        localStorage.setItem('userRole', cleanRole);
      }
      
      // Ne pas écraser tenantId si déjà défini
      if (tidStr) {
        localStorage.setItem('tenantId', tidStr);
      }
      
      // IMPORTANT: Toujours définir activeTenantId (utiliser tenantId en fallback)
      const finalTenantId = tidStr || localStorage.getItem('tenantId') || '';
      localStorage.setItem('activeTenantId', finalTenantId);
      
      console.log('[AuthService] FINAL localStorage state:');
      console.log('[AuthService] - userRole:', localStorage.getItem('userRole'));
      console.log('[AuthService] - tenantId:', localStorage.getItem('tenantId'));
      console.log('[AuthService] - activeTenantId:', localStorage.getItem('activeTenantId'));

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
    return this.api.post<{ 
      token: string; 
      mustChangePassword: boolean; 
      requires2fa: boolean;
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        businessId: string | null;
        tenantId: string | null;
      }
    }>(
      '/auth/signin',
      payload,
    );
  }

  handleLoginResponse(response: any) {
    const token = response.token || response.accessToken || '';
    const user = response.user || {};

    // Nettoyer le rôle
    const role = (user.role || response.role || '').replace('ROLE_', '');

    // Récupérer businessId depuis PLUSIEURS endroits
    const businessId =
      user.businessId        ||
      user.tenantId          ||
      response.businessId    ||
      response.tenantId      ||
      user.business?.id      ||
      user.businesses?.[0]?.id || '';

    // Récupérer tenantId séparément (ne jamais l'écraser avec businessId)
    const tenantId =
      user.tenantId ||
      response.tenantId ||
      user.company_id ||
      response.company_id ||
      '';

    console.log('Login response:', {
      userId    : user.id,
      role,
      businessId,
    });

    if (!businessId) {
      console.warn('⚠️ businessId MISSING in response!');
    }

    // Sauvegarder dans localStorage
    localStorage.setItem('token',          token);
    localStorage.setItem('accessToken',    token);
    localStorage.setItem('userId',         user.id || '');
    localStorage.setItem('userRole',       role);
    if (tenantId) {
      localStorage.setItem('tenantId', tenantId);
      localStorage.setItem('activeTenantId', tenantId);
    }
    localStorage.setItem('businessId',     businessId);
    localStorage.setItem(
      'businessName',
      user.business?.name ||
      user.businessName   || ''
    );

    // Mettre à jour les signaux Angular
    this.loginMock(token);

    return { token, user, businessId };
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

  createRole(payload: { name: string; isStandard?: boolean }) {
    return this.api.post<any>('/roles/create', payload);
  }

  deleteRole(roleId: string) {
    return this.api.delete<any>(`/roles/${roleId}`);
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
      try {
        localStorage.removeItem('taskflow-token');
        localStorage.removeItem('access_token');
      } catch {}
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
