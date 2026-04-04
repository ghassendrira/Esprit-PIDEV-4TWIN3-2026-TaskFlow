import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'tf-onboarding-layout',
  standalone: true,
  template: `
    <div class="min-h-screen" style="background: var(--tf-surface); color: var(--tf-on-surface);">
      <header class="h-16 flex items-center justify-between px-4 border-b" style="border-color: var(--tf-border);">
        <div class="flex items-center gap-2">
          <img src="/TASKFLOW-removebg-preview.png" alt="TaskFlow" class="h-16 w-auto max-w-[280px] object-contain" />
        </div>
        <a (click)="logout()" class="text-sm cursor-pointer" style="color: var(--tf-muted);">Logout</a>
      </header>
      <div class="grid place-items-center py-8">
        <div class="w-[min(580px,92vw)] rounded-2xl shadow-xl border" style="background: var(--tf-card); border-color: var(--tf-border);">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class OnboardingLayoutComponent {
  private auth = inject(AuthService);
  private tenant = inject(TenantService);
  title = signal<string>('TaskFlow');
  constructor() {
    try {
      const stored = localStorage.getItem('companyName');
      if (stored && stored.trim().length) {
        this.title.set(stored);
        this.tenant.setTenant(null, stored);
      } else {
        this.title.set(this.tenant.tenantName());
      }
    } catch {
      this.title.set(this.tenant.tenantName());
    }
  }
  logout() {
    this.auth.logout();
  }
}
