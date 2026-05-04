import { Component, inject, ViewChild, AfterViewInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService, Role } from '../../core/services/auth.service';
import { TranslatePipe } from '../../shared/pipes/t.pipe';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { RecaptchaComponent } from '../../shared/components/recaptcha.component';

@Component({
  selector: 'tf-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, NgIf, TranslatePipe, RecaptchaComponent],
  template: `
    <div class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-[var(--tf-surface)] to-[var(--tf-surface-2)]">
      <div class="relative w-[min(480px,92vw)] tf-card rounded-2xl p-6 sm:p-8 text-[var(--tf-on-surface)]">
        <button
          type="button"
          (click)="toggleLanguage()"
          class="absolute right-16 top-4 inline-flex items-center justify-center min-w-10 h-10 rounded-xl border border-[var(--tf-border)] bg-[var(--tf-card)] px-3 text-sm font-semibold tracking-wide hover:bg-[var(--tf-surface-2)] transition"
          [attr.aria-label]="'common.current-language' | t"
        >
          {{ language.isArabic() ? ('common.language-en' | t) : ('common.language-ar' | t) }}
        </button>
        <button
          type="button"
          (click)="toggleTheme()"
          class="absolute right-4 top-4 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--tf-border)] bg-[var(--tf-card)] hover:bg-[var(--tf-surface-2)] transition"
          [attr.aria-label]="'common.toggle-theme' | t"
        >
          <ng-container *ngIf="theme.isDark(); else sunIcon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          </ng-container>
          <ng-template #sunIcon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364L16.95 7.05M7.05 16.95l-1.414 1.414m0-12.728L7.05 7.05m9.9 9.9l1.414 1.414" />
              <circle cx="12" cy="12" r="4" stroke-width="2" />
            </svg>
          </ng-template>
        </button>

        <div class="flex flex-col items-center text-center mb-6 mt-1">
          <img src="/TASKFLOW-removebg-preview.png" alt="TaskFlow" class="h-20 sm:h-24 w-auto max-w-[340px] object-contain" />
          <h2 class="mt-4 text-2xl font-bold">{{ 'common.welcome' | t }}</h2>
          <p class="mt-1 text-sm text-[var(--tf-muted)]">{{ 'auth.login-to-space' | t }}</p>
        </div>

        <!-- Normal Login Form -->
        <form *ngIf="!show2faInput" class="space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div>
            <label class="block text-[10px] font-semibold uppercase tracking-widest text-[var(--tf-muted)] mb-2">{{ 'common.email' | t }}</label>
            <div class="relative">
              <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tf-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16v16H4V4z" opacity="0" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16l-8 6-8-6z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6v12H4V6" />
                </svg>
              </span>
              <input
                type="email"
                formControlName="email"
                required
                maxlength="254"
                autocomplete="email"
                [placeholder]="'auth.email-placeholder' | t"
                class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] pl-12 pr-4 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition"
              />
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-semibold uppercase tracking-widest text-[var(--tf-muted)] mb-2">{{ 'common.password' | t }}</label>
            <div class="relative">
              <input [type]="showPwd ? 'text' : 'password'" formControlName="password" required
                minlength="8"
                maxlength="128"
                     autocomplete="current-password"
                     [placeholder]="'auth.password-placeholder' | t"
                     class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] px-4 pr-12 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition"/>
              <button type="button" (click)="showPwd = !showPwd" [attr.aria-label]="showPwd ? ('common.hide-password' | t) : ('common.show-password' | t)"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tf-muted)] hover:text-[var(--tf-on-surface)] transition-colors duration-200 cursor-pointer">
                <ng-container *ngIf="!showPwd; else eyeOff">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M2.25 12c2.25-4.5 6-7.5 9.75-7.5S19.5 7.5 21.75 12c-2.25 4.5-6 7.5-9.75 7.5S4.5 16.5 2.25 12z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </ng-container>
                <ng-template #eyeOff>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3.98 8.223C5.94 5.54 9.03 3.75 12 3.75c3.75 0 7.5 3 9.75 7.5a17.6 17.6 0 01-2.03 3.18M6.75 6.75l10.5 10.5M12 20.25c-3 0-6.06-1.76-8.02-4.44a17.6 17.6 0 01-1.73-3.06M9.75 9.75a3 3 0 104.5 4.5" />
                  </svg>
                </ng-template>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between gap-3">
            <label class="flex items-center gap-2 text-sm text-[var(--tf-muted)] select-none">
              <input type="checkbox" class="rounded border-[var(--tf-border)] bg-[var(--tf-surface)] accent-[var(--tf-primary)]"/>
              {{ 'common.remember-me' | t }}
            </label>
            <a routerLink="/forgot-password" class="text-[var(--tf-primary)] text-sm hover:underline whitespace-nowrap">{{ 'common.forgot-password' | t }}</a>
          </div>
          <app-recaptcha #captcha (resolved)="recaptchaToken = $event" (expired)="recaptchaToken = ''"></app-recaptcha>
          <div *ngIf="errorMessage as err"
               class="rounded-xl px-4 py-3 text-sm border"
               aria-live="polite"
               [class.bg-red-900/40]="true"
               [class.border-red-700/40]="true"
               [class.text-red-200]="true">
            <span *ngIf="err.toLowerCase().includes('bloqué') || err.toLowerCase().includes('blocked')">🔒 </span>{{ err }}
          </div>
          <button class="w-full h-12 rounded-xl px-4 bg-[var(--tf-primary)] text-white dark:text-slate-900 font-semibold hover:brightness-95 transition disabled:opacity-50" [disabled]="form.invalid || lockoutActive || !recaptchaToken">
            {{ 'common.sign-in' | t }}
          </button>
        </form>

        <!-- 2FA OTP Form -->
        <div *ngIf="show2faInput" class="space-y-6 mt-6 animate-in zoom-in duration-200 text-center">
          <div class="w-16 h-16 bg-[var(--tf-surface-2)] border border-[var(--tf-border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">📱</span>
          </div>
          <h3 class="text-xl font-bold">{{ 'auth.twofa-title' | t }}</h3>
          <p class="text-sm text-[var(--tf-muted)]">{{ 'auth.twofa-description' | t }}</p>
          
          <div class="space-y-4 text-left">
                 <label class="block text-[10px] font-bold uppercase tracking-widest text-[var(--tf-muted)] mb-2">{{ 'auth.verification-code' | t }}</label>
                 <input [(ngModel)]="otpCode" 
                   inputmode="numeric"
                   pattern="[0-9]{6}"
                   placeholder="000000" 
                   maxlength="6"
                   class="w-full h-14 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] px-4 text-2xl text-center tracking-[0.5em] text-[var(--tf-on-surface)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition-all font-mono"/>
            
            <div *ngIf="errorMessage as err" class="text-red-400 text-xs text-center">{{ err }}</div>

            <div class="flex gap-4 pt-4">
              <button (click)="show2faInput = false" class="flex-1 h-11 rounded-xl border border-[var(--tf-border)] text-sm hover:bg-[var(--tf-surface-2)] transition-all">{{ 'common.back' | t }}</button>
              <button (click)="onVerify2fa()" 
                      [disabled]="otpCode.length !== 6 || isVerifying2fa"
                      class="flex-1 h-11 rounded-xl bg-[var(--tf-primary)] text-white dark:text-slate-900 font-bold text-sm transition-all">
                {{ isVerifying2fa ? ('common.verifying' | t) : ('common.verify' | t) }}
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="!show2faInput" class="text-sm text-[var(--tf-muted)] mt-6 text-center">
          {{ 'auth.no-account' | t }}
          <a class="text-[var(--tf-primary)] hover:underline" routerLink="/auth/register">{{ 'common.register' | t }}</a>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  protected theme = inject(ThemeService);
  protected language = inject(LanguageService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  @ViewChild('captcha') captchaRef!: RecaptchaComponent;

  showPwd = false;
  errorMessage: string | null = null;
  lockoutActive = false;
  recaptchaToken = '';
  private unlockTimer: any = null;

  // 2FA
  show2faInput = false;
  otpCode = '';
  userId = '';
  isGoogleLoading = false;
  private googleClient: any = null;
  private readonly GOOGLE_CLIENT_ID = '88558302113-d4s6fb9mll231ecro1dcj77bru0lja6p.apps.googleusercontent.com';

  ngAfterViewInit() {
    this.initGoogleClient();
  }

  private initGoogleClient() {
    const tryInit = () => {
      if (typeof (window as any).google?.accounts?.oauth2 !== 'undefined') {
        this.googleClient = (window as any).google.accounts.oauth2.initCodeClient({
          client_id: this.GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: (response: any) => {
            this.ngZone.run(() => this.handleGoogleCodeResponse(response));
          },
        });
      } else {
        setTimeout(tryInit, 300);
      }
    };
    tryInit();
  }

  onGoogleLogin() {
    if (this.isGoogleLoading) return;
    if (this.googleClient) {
      this.googleClient.requestCode();
    } else {
      this.errorMessage = this.language.translate('auth.google-loading');
      this.cdr.detectChanges();
    }
  }

  private handleGoogleCodeResponse(response: any) {
    if (response?.error || !response?.code) {
      this.errorMessage = this.language.translate('auth.google-error');
      this.cdr.detectChanges();
      return;
    }

    this.isGoogleLoading = true;
    this.errorMessage = null;

    this.auth.googleSignup({
      code: response.code,
    }).subscribe({
      next: (res: any) => {
        this.isGoogleLoading = false;
        if (res?.data?.token) {
          this.auth.loginMock(res.data.token);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = res?.message || this.language.translate('auth.google-error');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isGoogleLoading = false;
        this.errorMessage = err?.error?.message || this.language.translate('auth.google-error');
        this.cdr.detectChanges();
      }
    });
  }

  toggleTheme() {
    this.theme.toggle();
  }

  toggleLanguage() {
    this.language.toggle();
  }
  isVerifying2fa = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]]
  });

  onSubmit() {
    if (this.form.invalid || this.lockoutActive || !this.recaptchaToken) return;
    this.errorMessage = null;
    const email = this.form.value.email!;
    const password = this.form.value.password!;
    const recaptchaToken = this.recaptchaToken;
    this.auth.signin({ email, password, recaptchaToken }).subscribe({
      next: (res: any) => {
        if (res.requires2fa) {
          this.show2faInput = true;
          this.userId = res.userId;
          this.otpCode = '';
          return;
        }

        this.auth.loginMock(res.token);
        
        if (res.mustChangePassword) {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        const msg = this.getLoginErrorMessage(err);
        this.errorMessage = msg;
        this.recaptchaToken = '';
        this.captchaRef?.reset();
        const lower = String(msg).toLowerCase();
        if (lower.includes('bloqué') || lower.includes('blocked')) {
          this.lockoutActive = true;
          const match = String(msg).match(/(\d+)\s*minutes?/i);
          const mins = match ? Number(match[1]) : 60;
          if (this.unlockTimer) clearTimeout(this.unlockTimer);
          this.unlockTimer = setTimeout(() => {
            this.lockoutActive = false;
          }, mins * 60 * 1000);
        }
      }
    });
  }

  private getLoginErrorMessage(err: any): string {
    const raw = err?.error?.message ?? err?.message ?? '';
    const msg = Array.isArray(raw) ? raw.join(' ') : String(raw);
    const lower = msg.toLowerCase();

    if (err?.status === 403 && (lower.includes('bloqué') || lower.includes('blocked'))) {
      return msg || this.language.translate('auth.blocked-temporarily');
    }

    if (err?.status === 400) {
      if (lower.includes('approuvé') || lower.includes('approved') || lower.includes('registration')) {
        return this.language.translate('auth.pending-approval');
      }
      if (lower.includes('utilisateur non trouvé') || lower.includes('user not found')) {
        return this.language.translate('auth.invalid-credentials');
      }
      if (lower.includes('mot de passe incorrect') || lower.includes('password incorrect')) {
        return msg || this.language.translate('auth.invalid-password');
      }
    }

    return msg || this.language.translate('common.unknown-error');
  }

  onVerify2fa() {
    if (this.otpCode.length !== 6) return;
    this.isVerifying2fa = true;
    this.errorMessage = null;

    this.auth.verify2fa(this.userId, this.otpCode).subscribe({
      next: (res: any) => {
        this.isVerifying2fa = false;
        this.auth.loginMock(res.token);
        
        if (res.mustChangePassword) {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isVerifying2fa = false;
        this.errorMessage = err?.error?.message || this.language.translate('auth.otp-invalid');
      }
    });
  }

}

