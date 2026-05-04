import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslatePipe } from '../../pipes/t.pipe';

@Component({
  selector: 'tf-navbar',
  standalone: true,
  imports: [NgIf, RouterLink, TranslatePipe],
  template: `
    <nav class="sticky top-0 z-30 border-b" style="background: var(--tf-card); border-color: var(--tf-border);">
      <div class="h-16 px-4 md:px-6 flex items-center justify-between">
        <!-- Left: menu + brand -->
        <div class="flex items-center gap-2 min-w-0">
          <button
            type="button"
            class="w-10 h-10 inline-flex items-center justify-center rounded-lg border transition hover:bg-[var(--tf-surface-2)]"
            style="border-color: var(--tf-border); color: var(--tf-on-surface);"
            (click)="menuToggle.emit()"
            [attr.aria-label]="'common.menu' | t"
            [attr.title]="'common.menu' | t"
          >
            <span class="flex flex-col gap-1" aria-hidden="true">
              <span class="block w-5 h-0.5 rounded" style="background: var(--tf-on-surface);"></span>
              <span class="block w-5 h-0.5 rounded" style="background: var(--tf-on-surface);"></span>
              <span class="block w-5 h-0.5 rounded" style="background: var(--tf-on-surface);"></span>
            </span>
          </button>

          <a routerLink="/dashboard" class="flex items-center gap-3 min-w-0">
            <div
              *ngIf="!tenantLogo() && tenantName() !== 'TaskFlow'"
              class="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold border"
              style="border-color: var(--tf-border);"
              aria-hidden="true"
            >
              {{ tenantName().charAt(0) }}
            </div>
            <img
              *ngIf="!tenantLogo() && tenantName() === 'TaskFlow'"
              src="/TASKFLOW-removebg-preview.png"
              class="w-[170px] sm:w-[190px] h-auto object-contain"
              style="border-color: var(--tf-border);"
              alt="TaskFlow"
            />
            <img
              *ngIf="tenantLogo()"
              [src]="tenantLogo()"
              class="w-9 h-9 rounded-lg object-cover border"
              style="border-color: var(--tf-border);"
              alt="Logo"
            />

            <div class="min-w-0">
              <div class="font-semibold leading-tight truncate" style="color: var(--tf-on-surface);">
                {{ tenantName() }}
              </div>
              <div class="text-xs truncate muted">
                {{ userName() }}
              </div>
            </div>
          </a>
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="relative w-10 h-10 inline-flex items-center justify-center rounded-lg border transition hover:bg-[var(--tf-surface-2)]"
            style="border-color: var(--tf-border); color: var(--tf-on-surface);"
            [attr.aria-label]="'common.notifications' | t"
            [attr.title]="'common.notifications' | t"
          >
            <i class="fa-regular fa-bell text-lg"></i>
            <span
              class="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border"
              style="border-color: var(--tf-card);"
            ></span>
          </button>

          <button
            type="button"
            (click)="toggleTheme()"
            class="h-10 inline-flex items-center gap-2 px-3 rounded-lg border transition hover:bg-[var(--tf-surface-2)]"
            style="border-color: var(--tf-border); color: var(--tf-on-surface);"
            [attr.aria-label]="isDark() ? ('common.light' | t) : ('common.dark' | t)"
            [attr.title]="isDark() ? ('common.light' | t) : ('common.dark' | t)"
          >
            <i class="fa-solid" [class.fa-sun]="isDark()" [class.fa-moon]="!isDark()"></i>
            <span class="hidden sm:inline text-sm font-medium">{{ isDark() ? ('common.light' | t) : ('common.dark' | t) }}</span>
          </button>

          <button
            type="button"
            (click)="toggleLanguage()"
            class="h-10 inline-flex items-center gap-2 px-3 rounded-lg border transition hover:bg-[var(--tf-surface-2)]"
            style="border-color: var(--tf-border); color: var(--tf-on-surface);"
            [attr.aria-label]="'common.current-language' | t"
            [attr.title]="'common.current-language' | t"
          >
            <i class="fa-solid fa-language"></i>
            <span class="hidden sm:inline text-sm font-medium">{{ languageLabel() }}</span>
          </button>

          <a
            routerLink="/settings"
            class="h-10 inline-flex items-center gap-2 px-3 rounded-lg border transition hover:bg-[var(--tf-surface-2)]"
            style="border-color: var(--tf-border); color: var(--tf-on-surface);"
            [attr.title]="'common.settings' | t"
          >
            <span class="w-7 h-7 rounded-md bg-primary-50 border flex items-center justify-center text-primary-700"
                  style="border-color: var(--tf-border);">
              <i class="fa-solid fa-user-gear"></i>
            </span>
            <span class="hidden sm:inline text-sm font-medium">{{ 'common.settings' | t }}</span>
          </a>

          <button
            type="button"
            (click)="logout()"
            class="h-10 inline-flex items-center gap-2 px-3 rounded-lg border transition text-red-600 border-red-200 hover:bg-red-50"
            [attr.title]="'common.logout' | t"
            [attr.aria-label]="'common.logout' | t"
          >
            <i class="fa-solid fa-right-from-bracket"></i>
            <span class="hidden sm:inline text-sm font-semibold">{{ 'common.logout' | t }}</span>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: []
})
export class NavbarComponent {
  @Output() menuToggle = new EventEmitter<void>();

  private auth = inject(AuthService);
  private tenant = inject(TenantService);
  private language = inject(LanguageService);
  private theme = inject(ThemeService);

  isDark = computed(() => this.theme.isDark());
  isArabic = computed(() => this.language.isArabic());

  languageLabel = computed(() => (this.isArabic() ? this.language.translate('common.language-ar') : this.language.translate('common.language-en')));

  tenantName = computed(() => {
    // 1. Try from active tenant service (most reactive)
    const fromTenant = this.tenant.tenantName();
    if (fromTenant && fromTenant !== 'TaskFlow' && fromTenant !== 'GHASSEN DRIRA') return fromTenant;
    
    // 2. Try from user profile in auth
    const fromAuth = this.auth.user()?.tenantName;
    if (fromAuth && fromAuth !== 'TaskFlow' && fromAuth !== 'GHASSEN DRIRA') return fromAuth;

    // 3. Try from localStorage as last resort, but avoid the old default
    const fromStorage = localStorage.getItem('companyName');
    if (fromStorage && fromStorage !== 'GHASSEN DRIRA') return fromStorage;

    return 'TaskFlow';
  });
  tenantLogo = computed(() => this.tenant.logo());
  userName = computed(() => {
    this.language.language(); // track language
    const user = this.auth.user();
    if (user && user.name && user.name !== 'User') return user.name;
    return this.language.translate('common.business-owner');
  });

  logout() {
    this.auth.logout();
    window.location.href = '/auth/login';
  }

  toggleTheme() {
    this.theme.toggle();
  }

  toggleLanguage() {
    this.language.toggle();
  }

  constructor() {
    try {
      const name = localStorage.getItem('companyName');
      if (name && name.trim().length && name !== 'GHASSEN DRIRA') {
        this.tenant.setTenant(null, name);
      }
    } catch {}
  }
}
