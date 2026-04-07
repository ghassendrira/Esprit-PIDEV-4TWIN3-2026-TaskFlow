import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'tf-create-employee',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <div class="min-h-[calc(100vh-3rem)] p-6 bg-[var(--tf-surface)] text-[var(--tf-on-surface)]">
      <div class="max-w-xl mx-auto">
        <div class="bg-[var(--tf-card)] border border-[var(--tf-border)] rounded-2xl p-6 shadow-[var(--tf-shadow)]">
          <h2 class="text-xl font-bold mb-2">Créer un employé</h2>
          <p class="text-sm text-[var(--tf-muted)] mb-4">
            Les informations d’accès seront envoyées par email.
          </p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-sm text-[var(--tf-muted)] mb-1">Email</label>
              <input
                type="email"
                formControlName="email"
                placeholder="ex: nom@entreprise.com"
                class="w-full rounded-lg bg-[var(--tf-surface-2)] border border-[var(--tf-border)] px-3 py-2 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] placeholder:opacity-60 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary/10 transition"
                [class.border-red-500]="(form.get('email')?.touched || submitted) && form.get('email')?.invalid"
              />
              <div *ngIf="(form.get('email')?.touched || submitted) && form.get('email')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">L'email est obligatoire.</div>
              <div *ngIf="(form.get('email')?.touched || submitted) && form.get('email')?.errors?.['email']" class="text-red-500 text-[11px] mt-1 ml-1">Veuillez saisir une adresse email valide.</div>
              <div *ngIf="(form.get('email')?.touched || submitted) && form.get('email')?.errors?.['maxlength']" class="text-red-500 text-[11px] mt-1 ml-1">Email trop long (max 254 caractères).</div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-[var(--tf-muted)] mb-1">Prénom</label>
                <input
                  type="text"
                  formControlName="firstName"
                  placeholder="Votre prénom"
                  class="w-full rounded-lg bg-[var(--tf-surface-2)] border border-[var(--tf-border)] px-3 py-2 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] placeholder:opacity-60 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary/10 transition"
                  [class.border-red-500]="(form.get('firstName')?.touched || submitted) && form.get('firstName')?.invalid"
                />
                <div *ngIf="(form.get('firstName')?.touched || submitted) && form.get('firstName')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le prénom est obligatoire.</div>
                <div *ngIf="(form.get('firstName')?.touched || submitted) && form.get('firstName')?.errors?.['minlength']" class="text-red-500 text-[11px] mt-1 ml-1">Le prénom doit contenir au moins 2 caractères.</div>
                <div *ngIf="(form.get('firstName')?.touched || submitted) && form.get('firstName')?.errors?.['maxlength']" class="text-red-500 text-[11px] mt-1 ml-1">Prénom trop long (max 60 caractères).</div>
                <div *ngIf="(form.get('firstName')?.touched || submitted) && form.get('firstName')?.errors?.['pattern']" class="text-red-500 text-[11px] mt-1 ml-1">Le prénom ne doit contenir que des lettres.</div>
              </div>
              <div>
                <label class="block text-sm text-[var(--tf-muted)] mb-1">Nom</label>
                <input
                  type="text"
                  formControlName="lastName"
                  placeholder="Votre nom"
                  class="w-full rounded-lg bg-[var(--tf-surface-2)] border border-[var(--tf-border)] px-3 py-2 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] placeholder:opacity-60 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary/10 transition"
                  [class.border-red-500]="(form.get('lastName')?.touched || submitted) && form.get('lastName')?.invalid"
                />
                <div *ngIf="(form.get('lastName')?.touched || submitted) && form.get('lastName')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom est obligatoire.</div>
                <div *ngIf="(form.get('lastName')?.touched || submitted) && form.get('lastName')?.errors?.['minlength']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom doit contenir au moins 2 caractères.</div>
                <div *ngIf="(form.get('lastName')?.touched || submitted) && form.get('lastName')?.errors?.['maxlength']" class="text-red-500 text-[11px] mt-1 ml-1">Nom trop long (max 60 caractères).</div>
                <div *ngIf="(form.get('lastName')?.touched || submitted) && form.get('lastName')?.errors?.['pattern']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom ne doit contenir que des lettres.</div>
              </div>
            </div>

            <div>
              <label class="block text-sm text-[var(--tf-muted)] mb-1">Rôle</label>
              <select
                formControlName="role"
                class="w-full rounded-lg bg-[var(--tf-surface-2)] border border-[var(--tf-border)] px-3 py-2 text-[var(--tf-on-surface)] outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary/10 transition"
                [class.border-red-500]="(form.get('role')?.touched || submitted) && form.get('role')?.invalid"
              >
                <option value="" disabled>Sélectionner un rôle</option>
                <option value="ACCOUNTANT">ACCOUNTANT</option>
                <option value="ADMIN">ADMIN</option>
                <option value="TEAM_MEMBER">TEAM_MEMBER</option>
              </select>
              <div *ngIf="(form.get('role')?.touched || submitted) && form.get('role')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Veuillez sélectionner un rôle.</div>
            </div>

            <button
              type="submit"
              [disabled]="form.invalid || isSubmitting"
              class="w-full h-11 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold transition-all mt-4"
            >
              {{ isSubmitting ? 'Création...' : 'Créer' }}
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
  submitted = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  form: FormGroup = this.fb.group({
    email: ['', [
      Validators.required,
      Validators.email,
      Validators.maxLength(254)
    ]],
    firstName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(60),
      Validators.pattern(/^[a-zA-ZÀ-ÿ\s-]+$/)
    ]],
    lastName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(60),
      Validators.pattern(/^[a-zA-ZÀ-ÿ\s-]+$/)
    ]],
    role: ['', [Validators.required]],
  });

  onSubmit() {
    this.submitted = true;
    console.log('--- Formulaire Employé ---');
    console.log('Valide:', this.form.valid);
    console.log('Valeurs:', this.form.value);
    if (this.form.invalid) {
      console.log('Erreurs:', this.getFormErrors());
      return;
    }
    if (this.isSubmitting) return;

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

  private getFormErrors() {
    const errors: any = {};
    Object.keys(this.form.controls).forEach(key => {
      const controlErrors = this.form.get(key)?.errors;
      if (controlErrors) {
        errors[key] = controlErrors;
      }
    });
    return errors;
  }
}

