import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormGroup,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf, NgStyle } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ApiService } from '../../core/services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'tf-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgStyle],
  template: `
    <div class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-[var(--tf-surface)] to-[var(--tf-surface-2)]">
      <div
        class="relative w-[min(420px,92vw)] tf-card rounded-2xl p-6 text-[var(--tf-on-surface)]"
      >
        <button
          type="button"
          (click)="toggleTheme()"
          class="absolute right-4 top-4 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--tf-border)] bg-[var(--tf-card)] hover:bg-[var(--tf-surface-2)] transition"
          aria-label="Basculer le thème"
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

        <div class="flex items-center gap-2 mb-4">
          <img src="/TASKFLOW-removebg-preview.png" alt="TaskFlow" class="h-16 sm:h-20 w-auto max-w-[280px] object-contain" />
          <div class="font-semibold tracking-wide">TaskFlow</div>
        </div>

        <h1 class="text-center font-bold text-lg mb-2">
          Changez votre mot de passe
        </h1>
        <p class="text-center text-sm text-[var(--tf-muted)] mb-4">
          Pour votre sécurité, veuillez définir un nouveau mot de passe.
        </p>

        <div
          class="rounded-lg px-3 py-2 bg-amber-900/30 border border-amber-700/40 text-amber-200 text-sm mb-4"
          role="status"
        >
          <span class="inline-flex items-center gap-2">
            <span>🔐</span>
            <span>Vous utilisez un mot de passe temporaire. Veuillez le changer maintenant.</span>
          </span>
        </div>

        <form
          class="space-y-4"
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
        >
          <div>
            <label class="block text-sm text-[var(--tf-muted)] mb-1">
              Mot de passe actuel
            </label>
            <div class="relative">
              <input
                [type]="showCurrentPwd ? 'text' : 'password'"
                formControlName="currentPassword"
                required
                minlength="8"
                maxlength="128"
                class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] px-4 pr-12 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition"
              />
              <button
                type="button"
                (click)="showCurrentPwd = !showCurrentPwd"
                aria-label="Afficher le mot de passe actuel"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tf-muted)] hover:text-[var(--tf-on-surface)] transition-colors duration-200 cursor-pointer"
              >
                <ng-container *ngIf="!showCurrentPwd; else eyeOff1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.25 12c2.25-4.5 6-7.5 9.75-7.5S19.5 7.5 21.75 12c-2.25 4.5-6 7.5-9.75 7.5S4.5 16.5 2.25 12z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </ng-container>
                <ng-template #eyeOff1>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3.98 8.223C5.94 5.54 9.03 3.75 12 3.75c3.75 0 7.5 3 9.75 7.5a17.6 17.6 0 01-2.03 3.18M6.75 6.75l10.5 10.5M12 20.25c-3 0-6.06-1.76-8.02-4.44a17.6 17.6 0 01-1.73-3.06M9.75 9.75a3 3 0 104.5 4.5"
                    />
                  </svg>
                </ng-template>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm text-[var(--tf-muted)] mb-1">
              Nouveau mot de passe
            </label>
            <div class="relative">
              <input
                [type]="showNewPwd ? 'text' : 'password'"
                formControlName="newPassword"
                required
                minlength="8"
                maxlength="128"
                class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] px-4 pr-12 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition"
              />
              <button
                type="button"
                (click)="showNewPwd = !showNewPwd"
                aria-label="Afficher le nouveau mot de passe"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tf-muted)] hover:text-[var(--tf-on-surface)] transition-colors duration-200 cursor-pointer"
              >
                <ng-container *ngIf="!showNewPwd; else eyeOff2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.25 12c2.25-4.5 6-7.5 9.75-7.5S19.5 7.5 21.75 12c-2.25 4.5-6 7.5-9.75 7.5S4.5 16.5 2.25 12z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </ng-container>
                <ng-template #eyeOff2>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3.98 8.223C5.94 5.54 9.03 3.75 12 3.75c3.75 0 7.5 3 9.75 7.5a17.6 17.6 0 01-2.03 3.18M6.75 6.75l10.5 10.5M12 20.25c-3 0-6.06-1.76-8.02-4.44a17.6 17.6 0 01-1.73-3.06M9.75 9.75a3 3 0 104.5 4.5"
                    />
                  </svg>
                </ng-template>
              </button>
            </div>

            <div class="mt-2">
              <div class="flex items-center justify-between text-xs text-[var(--tf-muted)] mb-1">
                <span>Force</span>
                <span class="font-medium" [ngStyle]="{ color: strengthColor }">
                  {{ strengthLabel }}
                </span>
              </div>
              <div class="h-2 w-full bg-[var(--tf-surface-2)] border border-[var(--tf-border)] rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  [ngStyle]="{ width: strengthPercent + '%', background: strengthColor }"
                ></div>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm text-[var(--tf-muted)] mb-1">
              Confirmer le mot de passe
            </label>
            <div class="relative">
              <input
                [type]="showConfirmPwd ? 'text' : 'password'"
                formControlName="confirmPassword"
                required
                minlength="8"
                maxlength="128"
                class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] px-4 pr-12 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition"
              />
              <button
                type="button"
                (click)="showConfirmPwd = !showConfirmPwd"
                aria-label="Afficher la confirmation du mot de passe"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tf-muted)] hover:text-[var(--tf-on-surface)] transition-colors duration-200 cursor-pointer"
              >
                <ng-container *ngIf="!showConfirmPwd; else eyeOff3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.25 12c2.25-4.5 6-7.5 9.75-7.5S19.5 7.5 21.75 12c-2.25 4.5-6 7.5-9.75 7.5S4.5 16.5 2.25 12z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </ng-container>
                <ng-template #eyeOff3>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3.98 8.223C5.94 5.54 9.03 3.75 12 3.75c3.75 0 7.5 3 9.75 7.5a17.6 17.6 0 01-2.03 3.18M6.75 6.75l10.5 10.5M12 20.25c-3 0-6.06-1.76-8.02-4.44a17.6 17.6 0 01-1.73-3.06M9.75 9.75a3 3 0 104.5 4.5"
                    />
                  </svg>
                </ng-template>
              </button>
            </div>
          </div>

          <div class="mt-1">
            <div class="text-xs text-[var(--tf-muted)] mb-2">
              Exigences :
            </div>
            <div class="space-y-1 text-xs">
              <div class="flex items-center gap-2">
                <span [class.text-primary-500]="checkLen" [class.text-slate-400]="!checkLen">
                  ✓
                </span>
                <span [class.text-primary-500]="checkLen" [class.text-slate-400]="!checkLen">
                  Au moins 8 caractères
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span [class.text-primary-500]="checkUpper" [class.text-slate-400]="!checkUpper">
                  ✓
                </span>
                <span [class.text-primary-500]="checkUpper" [class.text-slate-400]="!checkUpper">
                  Une lettre majuscule
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span [class.text-primary-500]="checkLower" [class.text-slate-400]="!checkLower">
                  ✓
                </span>
                <span [class.text-primary-500]="checkLower" [class.text-slate-400]="!checkLower">
                  Une lettre minuscule
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span [class.text-primary-500]="checkNumber" [class.text-slate-400]="!checkNumber">
                  ✓
                </span>
                <span [class.text-primary-500]="checkNumber" [class.text-slate-400]="!checkNumber">
                  Un chiffre
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span [class.text-primary-500]="checkSpecial" [class.text-slate-400]="!checkSpecial">
                  ✓
                </span>
                <span [class.text-primary-500]="checkSpecial" [class.text-slate-400]="!checkSpecial">
                  Un caractère spécial
                </span>
              </div>
            </div>
          </div>

          <div *ngIf="errorMessage" class="text-sm text-red-400">
            {{ errorMessage }}
          </div>

          <div *ngIf="successMessage" class="text-sm text-[var(--tf-muted)]">
            {{ successMessage }}
          </div>

          <button
            class="w-full rounded-lg px-4 py-2 bg-[var(--tf-primary)] text-white dark:text-slate-900 font-semibold hover:brightness-95 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            type="submit"
            [disabled]="form.invalid || isSubmitting"
          >
            <svg
              *ngIf="isSubmitting"
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" stroke-width="4" opacity="0.25" />
              <path
                d="M22 12c0-5.523-4.477-10-10-10"
                stroke-width="4"
                stroke-linecap="round"
              />
            </svg>
            <span>Changer mon mot de passe</span>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [],
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  protected theme = inject(ThemeService);

  showCurrentPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;

  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  toggleTheme() {
    this.theme.toggle();
  }

  form: FormGroup = this.fb.group(
    {
      currentPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    },
    { validators: this.passwordsMatchValidator },
  );

  get newPassword(): string {
    return this.form.get('newPassword')?.value ?? '';
  }

  get checkLen(): boolean {
    return this.newPassword.length >= 8;
  }
  get checkUpper(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }
  get checkLower(): boolean {
    return /[a-z]/.test(this.newPassword);
  }
  get checkNumber(): boolean {
    return /[0-9]/.test(this.newPassword);
  }
  get checkSpecial(): boolean {
    return /[^A-Za-z0-9]/.test(this.newPassword);
  }

  get strengthScore(): number {
    const score = [
      this.checkLen,
      this.checkUpper,
      this.checkLower,
      this.checkNumber,
      this.checkSpecial,
    ].filter(Boolean).length;
    return score; // 0..5
  }

  get strengthLabel(): string {
    if (this.strengthScore <= 2) return 'Faible';
    if (this.strengthScore <= 3) return 'Moyen';
    return 'Fort';
  }

  get strengthColor(): string {
    if (this.strengthScore <= 2) return '#ef4444'; // red
    if (this.strengthScore <= 3) return '#fbbf24'; // amber
    return '#22c55e'; // green
  }

  get strengthPercent(): number {
    // 5 checks => map to a nice percent scale
    return Math.round((this.strengthScore / 5) * 100);
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return {};
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const pad = '='.repeat((4 - (base64.length % 4)) % 4);
      const json = atob(base64 + pad);
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return {};
    }
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const fg = group as FormGroup;
    const newPassword = fg.get('newPassword')?.value ?? '';
    const confirmPassword = fg.get('confirmPassword')?.value ?? '';
    if (!confirmPassword) return null;
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }

  onSubmit() {
    if (this.form.invalid || this.isSubmitting) return;

    this.errorMessage = null;
    this.successMessage = null;
    this.isSubmitting = true;

    const currentPassword = this.form.value.currentPassword!;
    const newPassword = this.form.value.newPassword!;

    (async () => {
      try {
        const res = await firstValueFrom(
          this.auth.changePassword({ currentPassword, newPassword }),
        );

        // Update token first (so we decode the "new" JWT if returned).
        const newToken = (res as any)?.token as string | undefined;
        if (newToken) {
          this.auth.loginMock(newToken);
        }

        const token = localStorage.getItem('token') ?? newToken ?? '';
        const decoded = this.decodeJwt(token);
        const email = decoded?.email as string | undefined;
        const fullName = decoded?.name as string | undefined;
        const userId = decoded?.sub as string | undefined;

        if (!email || !fullName || !userId) {
          throw new Error(
            "Impossible de décoder le token (email/fullName/userId manquants).",
          );
        }

        // 1) Send welcome email (via API-Gateway to avoid CORS).
        await firstValueFrom(
          this.api.post('/notification/welcome', {
            email,
            fullName,
            userId,
          }),
        );

        // 2) Only after welcome email is sent -> navigate.
        this.successMessage =
          'Mot de passe mis à jour avec succès. Redirection...';
        setTimeout(() => {
          this.router.navigateByUrl('/settings');
        }, 1200);
      } catch (err: any) {
        const msg = err?.error?.message ?? err?.message ?? 'Erreur inconnue';
        this.errorMessage = msg;
      } finally {
        this.isSubmitting = false;
      }
    })();
  }
}

