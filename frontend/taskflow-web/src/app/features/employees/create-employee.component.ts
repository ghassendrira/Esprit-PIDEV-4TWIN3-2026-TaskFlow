import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'tf-create-employee',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <div class="min-h-[calc(100vh-3rem)] p-6 bg-[#0a1f0a] text-white">
      <div class="max-w-xl mx-auto">
        <div class="bg-white/5 border border-emerald-700/30 rounded-2xl p-6 text-white">
          <h2 class="text-xl font-bold mb-2">Créer un employé</h2>
          <p class="text-sm text-gray-300 mb-4">
            Les informations d’accès seront envoyées par email.
          </p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                formControlName="email"
                class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white placeholder-gray-400 outline-none focus:border-[#00C853] transition"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-gray-300 mb-1">Prénom</label>
                <input
                  type="text"
                  formControlName="firstName"
                  class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white placeholder-gray-400 outline-none focus:border-[#00C853] transition"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-300 mb-1">Nom</label>
                <input
                  type="text"
                  formControlName="lastName"
                  class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white placeholder-gray-400 outline-none focus:border-[#00C853] transition"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm text-gray-300 mb-1">Rôle</label>
              <select
                formControlName="role"
                class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white outline-none focus:border-[#00C853] transition"
              >
                <option value="ACCOUNTANT">ACCOUNTANT</option>
                <option value="ADMIN">ADMIN</option>
                <option value="TEAM_MEMBER">TEAM_MEMBER</option>
              </select>
            </div>

            <div *ngIf="errorMessage" class="text-sm text-red-400">
              {{ errorMessage }}
            </div>
            <div *ngIf="successMessage" class="text-sm text-emerald-300">
              {{ successMessage }}
            </div>

            <button
              type="submit"
              class="w-full rounded-lg px-4 py-2 bg-[#00C853] text-black font-semibold hover:shadow-[0_0_0_3px_rgba(0,200,83,.35)] hover:scale-[1.02] transition disabled:opacity-50"
              [disabled]="form.invalid || isSubmitting"
            >
              <span *ngIf="!isSubmitting">Créer</span>
              <span *ngIf="isSubmitting">...</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class CreateEmployeeComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    role: ['ACCOUNTANT', [Validators.required]],
  });

  onSubmit() {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = null;
    this.successMessage = null;

    const payload = this.form.value as {
      email: string;
      firstName: string;
      lastName: string;
      role: 'ACCOUNTANT' | 'ADMIN' | 'TEAM_MEMBER';
    };

    this.auth.createEmployee(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.successMessage =
          res?.message ?? 'Employee account created. Login details sent by email.';
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message ?? err?.message ?? 'Erreur lors de la création';
      },
    });
  }
}

