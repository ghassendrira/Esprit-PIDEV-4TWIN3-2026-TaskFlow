import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'tf-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <div class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-[var(--tf-surface)] to-[var(--tf-surface-2)]">
      <div class="relative w-[min(420px,92vw)] tf-card rounded-2xl p-6 text-[var(--tf-on-surface)]">
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
        <h2 class="text-lg font-bold mb-1">Réinitialiser le mot de passe</h2>
        <p class="text-sm text-[var(--tf-muted)] mb-4">Entrez votre nouveau mot de passe.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="block text-sm text-[var(--tf-muted)] mb-1">Nouveau mot de passe</label>
            <input type="password" formControlName="newPassword" minlength="8" maxlength="128" class="w-full rounded-lg bg-[var(--tf-surface)] border border-[var(--tf-border)] px-3 py-2 text-[var(--tf-on-surface)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition" />
          </div>
          <div class="text-xs text-[var(--tf-muted)]">
            8 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.
          </div>
          <div *ngIf="errorMessage" class="text-sm text-red-300">{{ errorMessage }}</div>
          <div *ngIf="successMessage" class="text-sm text-[var(--tf-muted)]">{{ successMessage }}</div>
          <button class="w-full rounded-lg px-4 py-2 bg-[var(--tf-primary)] text-white dark:text-slate-900 font-semibold disabled:opacity-50" [disabled]="form.invalid || loading">Mettre à jour</button>
        </form>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected theme = inject(ThemeService);

  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)]],
  });

  toggleTheme() {
    this.theme.toggle();
  }

  submit() {
    if (this.form.invalid || this.loading) return;
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.errorMessage = 'Token de réinitialisation manquant.';
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.auth
      .resetPassword({ resetToken: token, newPassword: this.form.value.newPassword! })
      .subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Mot de passe réinitialisé. Redirection...';
          setTimeout(() => this.router.navigateByUrl('/auth/login'), 1200);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.message ?? err?.message ?? 'Erreur';
        },
      });
  }
}

