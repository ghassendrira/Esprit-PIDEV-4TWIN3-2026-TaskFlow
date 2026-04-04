import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'tf-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <div class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-black to-[#0a2e1f]">
      <div class="w-[min(420px,92vw)] rounded-2xl p-6 border border-emerald-700/30 bg-[#0d1f17] text-white shadow-[0_0_0_1px_rgba(0,200,83,.15),0_15px_50px_rgba(0,200,83,.08)]">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-6 h-6 rounded bg-[#00C853]"></div>
          <div class="font-semibold tracking-wide">TaskFlow</div>
        </div>
        <h2 class="text-lg font-bold mb-1">Réinitialiser le mot de passe</h2>
        <p class="text-sm text-gray-300 mb-4">Entrez votre nouveau mot de passe.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-300 mb-1">Nouveau mot de passe</label>
            <input type="password" formControlName="newPassword" class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white outline-none focus:border-[#00C853] transition" />
          </div>
          <div class="text-xs text-gray-300">
            8 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.
          </div>
          <div *ngIf="errorMessage" class="text-sm text-red-300">{{ errorMessage }}</div>
          <div *ngIf="successMessage" class="text-sm text-emerald-300">{{ successMessage }}</div>
          <button class="w-full rounded-lg px-4 py-2 bg-[#00C853] text-black font-semibold disabled:opacity-50" [disabled]="form.invalid || loading">Mettre à jour</button>
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

  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

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

