import { Component, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService, Role } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { finalize, timeout } from 'rxjs/operators';

@Component({
  selector: 'tf-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIf],
  template: `
    <div class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-[var(--tf-surface)] to-[var(--tf-surface-2)]">
      <div class="relative w-[min(520px,92vw)] tf-card rounded-2xl p-6 sm:p-8 text-[var(--tf-on-surface)]">
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

        <button
          type="button"
          routerLink="/auth/login"
          class="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-[var(--tf-border)] bg-[var(--tf-card)] px-3 py-2 text-sm font-medium text-[var(--tf-on-surface)] transition hover:bg-[var(--tf-surface-2)]"
          aria-label="Retour à la connexion"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <div class="flex flex-col items-center text-center mb-6 mt-1">
          <img src="/TASKFLOW-removebg-preview.png" alt="TaskFlow" class="h-20 sm:h-24 w-auto max-w-[340px] object-contain" />
          <h2 class="mt-4 text-2xl font-bold">Créer votre compte</h2>
          <p class="mt-1 text-sm text-[var(--tf-muted)]">Essai gratuit 30 jours, aucune carte requise 🎉</p>
        </div>

        <div *ngIf="showSuccessBanner" class="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-center shadow-sm" aria-live="polite">
          <div class="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-1">Inscription envoyée</div>
          <div class="text-base sm:text-lg font-semibold text-emerald-900 dark:text-emerald-100 whitespace-pre-line leading-relaxed">
            {{ successMessage }}
          </div>
        </div>

        <form class="space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-widest text-[var(--tf-muted)] mb-2">Prénom</label>
              <input formControlName="firstName" required minlength="2" maxlength="60" autocomplete="given-name" placeholder="Votre prénom"
                     class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] px-4 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition"/>
                <p *ngIf="showError('firstName', 'required')" class="mt-1 text-xs text-red-400">Le prénom est obligatoire.</p>
                <p *ngIf="showError('firstName', 'minlength')" class="mt-1 text-xs text-red-400">Le prénom doit contenir au moins 2 caractères.</p>
                <p *ngIf="fieldErrors.firstName" class="mt-1 text-xs text-red-400">{{ fieldErrors.firstName }}</p>
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-widest text-[var(--tf-muted)] mb-2">Nom</label>
              <input formControlName="lastName" required minlength="2" maxlength="60" autocomplete="family-name" placeholder="Votre nom"
                     class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] px-4 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition"/>
              <p *ngIf="showError('lastName', 'required')" class="mt-1 text-xs text-red-400">Le nom est obligatoire.</p>
              <p *ngIf="showError('lastName', 'minlength')" class="mt-1 text-xs text-red-400">Le nom doit contenir au moins 2 caractères.</p>
                <p *ngIf="fieldErrors.lastName" class="mt-1 text-xs text-red-400">{{ fieldErrors.lastName }}</p>
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-semibold uppercase tracking-widest text-[var(--tf-muted)] mb-2">Nom de l'entreprise</label>
            <div class="relative">
              <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tf-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21h18" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 21V7a2 2 0 012-2h10a2 2 0 012 2v14" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 21v-8h6v8" />
                </svg>
              </span>
              <input formControlName="company" required minlength="2" maxlength="120" autocomplete="organization" placeholder="Nom de votre entreprise"
                     class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] pl-12 pr-4 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition"/>
            </div>
            <p *ngIf="showError('company', 'required')" class="mt-1 text-xs text-red-400">Le nom de l'entreprise est obligatoire.</p>
            <p *ngIf="showError('company', 'minlength')" class="mt-1 text-xs text-red-400">Le nom de l'entreprise doit contenir au moins 2 caractères.</p>
            <p *ngIf="fieldErrors.company" class="mt-1 text-xs text-red-400">{{ fieldErrors.company }}</p>
          </div>
          <div>
            <label class="block text-[10px] font-semibold uppercase tracking-widest text-[var(--tf-muted)] mb-2">Catégorie de l'entreprise (optionnel)</label>
            <select formControlName="companyCategory"
                    class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] px-4 text-[var(--tf-on-surface)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition">
              <option value="">Sélectionner une catégorie</option>
              <option value="Retail">Retail</option>
              <option value="Services">Services</option>
              <option value="Technology">Technology</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Freelance">Freelance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-semibold uppercase tracking-widest text-[var(--tf-muted)] mb-2">Email professionnel</label>
            <div class="relative">
              <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tf-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16l-8 6-8-6z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6v12H4V6" />
                </svg>
              </span>
              <input type="email" formControlName="email" required maxlength="254" autocomplete="email" placeholder="ex: nom@entreprise.com"
                     class="w-full h-12 rounded-xl bg-[var(--tf-surface)] border border-[var(--tf-border)] pl-12 pr-4 text-[var(--tf-on-surface)] placeholder:text-[var(--tf-muted)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition"/>
            </div>
            <p *ngIf="showError('email', 'required')" class="mt-1 text-xs text-red-400">L'email professionnel est obligatoire.</p>
            <p *ngIf="showError('email', 'email')" class="mt-1 text-xs text-red-400">Veuillez saisir une adresse email valide.</p>
            <p *ngIf="fieldErrors.email" class="mt-1 text-xs text-red-400">{{ fieldErrors.email }}</p>
          </div>
          <label class="flex items-center gap-2 text-sm text-[var(--tf-muted)] select-none">
            <input type="checkbox" formControlName="accept" class="rounded border-[var(--tf-border)] bg-[var(--tf-surface)] accent-[var(--tf-primary)]"/>
            J'accepte les Conditions d'utilisation
          </label>
          <p *ngIf="showError('accept', 'requiredTrue')" class="mt-1 text-xs text-red-400">Vous devez accepter les Conditions d'utilisation.</p>
          <p *ngIf="fieldErrors.accept" class="mt-1 text-xs text-red-400">{{ fieldErrors.accept }}</p>
          <button class="w-full h-12 rounded-xl px-4 bg-[var(--tf-primary)] text-white dark:text-slate-900 font-semibold hover:brightness-95 transition disabled:opacity-50"
              [disabled]="form.invalid || isSubmitting">
            Créer mon compte
          </button>
          <div class="flex items-center gap-3 text-[var(--tf-muted)] text-xs">
            <div class="flex-1 h-px bg-[var(--tf-border)]"></div>
            — ou s'inscrire avec —
            <div class="flex-1 h-px bg-[var(--tf-border)]"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" class="relative w-full h-12 rounded-[10px] bg-[var(--tf-surface-2)] text-[var(--tf-on-surface)] border border-[var(--tf-border)] hover:brightness-95 transition-colors duration-200 transform hover:-translate-y-0.5">
              <span class="absolute left-3 top-1/2 -translate-y-1/2">
                <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.9-6.9C35.89 2.1 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.55 6.64C12.87 13.2 17.96 9.5 24 9.5z"/>
                <path fill="#FBBC05" d="M46.5 24c0-1.64-.15-3.21-.44-4.73H24v9.06h12.7c-.55 2.98-2.16 5.51-4.61 7.2l7.02 5.45C43.74 37.24 46.5 31.1 46.5 24z"/>
                <path fill="#34A853" d="M11.11 19.86l-8.55-6.64C.9 16.3 0 20.03 0 24c0 3.97.9 7.7 2.56 10.78l8.55-6.64C10.36 26.7 10 25.39 10 24s.36-2.7 1.11-4.14z"/>
                <path fill="#4285F4" d="M24 48c6.48 0 11.93-2.13 15.9-5.82l-7.02-5.45c-2 1.35-4.56 2.14-8.88 2.14-6.04 0-11.13-3.7-12.89-8.36l-8.55 6.64C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              </span>
              <span class="block text-center">S'inscrire avec Google </span>
            </button>
            <button type="button" class="relative w-full h-12 rounded-[10px] bg-[var(--tf-surface-2)] text-[var(--tf-on-surface)] border border-[var(--tf-border)] hover:brightness-95 transition-colors duration-200 transform hover:-translate-y-0.5">
              <span class="absolute left-1 top-1/2 -translate-y-1/2">
                <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.436H7.078v-3.49h3.047V9.41c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953h-1.513c-1.492 0-1.956.93-1.956 1.883v2.257h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                <path fill="#fff" d="M16.671 15.563l.532-3.49h-3.328V9.238c0-.953.464-1.883 1.956-1.883h1.513V4.402s-1.373-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.837H7.078v3.49h3.047V24h3.75v-8.437h2.796z"/>
                </svg>
              </span>
              <span class="block text-center">S'inscrire avec Facebook</span>
            </button>
            <button type="button" class="relative w-full h-12 rounded-[10px] bg-[var(--tf-surface-2)] text-[var(--tf-on-surface)] border border-[var(--tf-border)] hover:brightness-95 transition-colors duration-200 transform hover:-translate-y-0.5">
              <span class="absolute left-3 top-1/2 -translate-y-1/2">
                <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#0A66C2" d="M22.225 0H1.771C.792 0 0 .774 0 1.728v20.543C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.728C24 .774 23.2 0 22.222 0h.003z"/>
                <path fill="#fff" d="M7.07 20.452H3.558V9.018H7.07v11.434zM5.314 7.51a2.041 2.041 0 110-4.082 2.041 2.041 0 010 4.082zm15.138 12.942h-3.512v-5.56c0-1.327-.028-3.037-1.85-3.037-1.853 0-2.136 1.447-2.136 2.941v5.656H9.44V9.018h3.37v1.561h.048c.469-.889 1.613-1.828 3.32-1.828 3.551 0 4.205 2.338 4.205 5.377v6.324z"/>
                </svg>
              </span>
              <span class="block text-center">S'inscrire avec LinkedIn</span>
            </button>
            <button type="button" class="relative w-full h-12 rounded-[10px] bg-[var(--tf-surface-2)] text-[var(--tf-on-surface)] border border-[var(--tf-border)] hover:brightness-95 transition-colors duration-200 transform hover:-translate-y-0.5">
              <span class="absolute left-3 top-1/2 -translate-y-1/2">
                <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#fff" d="M16.365 1.43c0 1.12-.422 2.153-1.117 2.987-.676.808-1.787 1.43-2.87 1.347-.13-1.1.38-2.17 1.038-2.947.673-.792 1.857-1.372 2.95-1.387zM20.97 17.186c-.057 1.555.504 3.18 1.535 4.315-.67.207-1.38.3-2.08.3-1.095 0-1.975-.218-2.62-.474-.65-.257-1.243-.598-1.8-.598-.59 0-1.23.327-1.9.593-.674.268-1.41.478-2.31.478-.76 0-1.52-.1-2.23-.32-.7-.217-1.34-.56-1.9-1.014-1.5-1.21-2.23-3.28-2.23-5.18 0-2.39.97-4.39 2.45-5.6 1.07-.86 2.4-1.38 3.71-1.38.94 0 1.8.3 2.5.56.7.25 1.2.53 1.78.53.5 0 .98-.23 1.56-.47.77-.31 1.67-.62 2.76-.62.7 0 1.39.15 2.03.46-.55.6-.99 1.34-1.22 2.14-.23.81-.21 1.7-.21 1.95z"/>
                </svg>
              </span>
              <span class="block text-center">S'inscrire avec Apple</span>
            </button>
          </div>
        </form>
        <div *ngIf="errorMessage" class="mt-4 rounded-xl border border-red-700/40 bg-red-900/40 px-4 py-3 text-sm text-red-200 text-center whitespace-pre-line" aria-live="polite">
          {{ errorMessage }}
        </div>
        <div class="text-sm text-[var(--tf-muted)] mt-6 text-center">
          Déjà un compte ?
          <a class="text-[var(--tf-primary)] hover:underline" routerLink="/auth/login">Se connecter</a>
        </div>
        <div class="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--tf-surface-2)] border border-[var(--tf-border)] text-xs text-[var(--tf-muted)]">
          🇹🇳 Données hébergées en Tunisie • Conformité INPDP garantie
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  protected theme = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    company: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    companyCategory: [''],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    accept: [false, Validators.requiredTrue]
  });

  successMessage: string | null = null;
  showSuccessBanner = false;
  errorMessage: string | null = null;
  isSubmitting = false;
  submitted = false;
  fieldErrors: Partial<Record<'firstName' | 'lastName' | 'company' | 'email' | 'accept', string>> = {};
  private successTimer: number | null = null;

  toggleTheme() {
    this.theme.toggle();
  }

  onSubmit() {
    if (this.isSubmitting) return;

    if (this.successTimer !== null) {
      window.clearTimeout(this.successTimer);
      this.successTimer = null;
    }
    this.submitted = true;
    this.showSuccessBanner = false;
    this.successMessage = null;
    this.errorMessage = null;
    this.fieldErrors = {};

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const first = (this.form.value.firstName as string).trim();
    const last = (this.form.value.lastName as string).trim();
    const company = (this.form.value.company as string).trim();
    const email = this.form.value.email!;

    const companyCategory = (this.form.value.companyCategory as string) || undefined;

    this.auth
      .signup({
        firstName: first,
        lastName: last,
        email,
        companyName: company,
        companyCategory,
      })
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => (this.isSubmitting = false)),
      )
      .subscribe({
      next: (response: any) => {
        try {
          localStorage.setItem('companyName', company);
        } catch {}
        this.form.reset({
          firstName: '',
          lastName: '',
          company: '',
          companyCategory: '',
          email: '',
          accept: false,
        });
        this.submitted = false;
        this.fieldErrors = {};
        this.successMessage =
          response?.message ||
          'Votre demande d\'inscription a été envoyée avec succès.\n' +
            'Veuillez patienter, vous recevrez prochainement un email du Super Admin\n' +
            'contenant votre email et mot de passe pour vous connecter.';
        this.showSuccessBanner = true;
        this.successTimer = window.setTimeout(() => {
          this.showSuccessBanner = false;
          this.successMessage = null;
          this.successTimer = null;
          this.cdr.detectChanges();
        }, 7000);
        this.cdr.detectChanges();
      },
      error: (error) => {
        if (error?.name === 'TimeoutError') {
          this.errorMessage = 'Le serveur met trop de temps à répondre. Réessayez.';
        } else if (error?.status === 409) {
          this.errorMessage = 'Un compte avec cet email existe déjà';
        } else if (error?.status === 400) {
          this.applyBackendValidationErrors(error?.error?.message);
          if (!Object.keys(this.fieldErrors).length) {
            this.errorMessage = typeof error?.error?.message === 'string' ? error.error.message : 'Données invalides';
          }
        } else {
          this.errorMessage = 'Une erreur serveur est survenue';
        }
      }
    });
  }

  private applyBackendValidationErrors(message: string | string[] | undefined) {
    const messages = Array.isArray(message) ? message : message ? [message] : [];
    for (const msg of messages) {
      const lower = String(msg).toLowerCase();
      if (lower.includes('firstname') || lower.includes('first name')) {
        this.fieldErrors.firstName = this.humanizeBackendMessage(msg, 'firstName');
      } else if (lower.includes('lastname') || lower.includes('last name')) {
        this.fieldErrors.lastName = this.humanizeBackendMessage(msg, 'lastName');
      } else if (lower.includes('companyname') || lower.includes('company name') || lower.includes('company')) {
        this.fieldErrors.company = this.humanizeBackendMessage(msg, 'company');
      } else if (lower.includes('email')) {
        this.fieldErrors.email = 'Veuillez saisir une adresse email valide.';
      } else if (lower.includes('accept')) {
        this.fieldErrors.accept = 'Vous devez accepter les Conditions d\'utilisation.';
      }
    }
  }

  private humanizeBackendMessage(message: string, field: string) {
    const lower = message.toLowerCase();
    if (lower.includes('should not be empty') || lower.includes('must not be empty') || lower.includes('required')) {
      return `${field === 'firstName' ? 'Le prénom' : field === 'lastName' ? 'Le nom' : 'Le nom de l\'entreprise'} est obligatoire.`;
    }
    if (lower.includes('minlength') || lower.includes('must be longer') || lower.includes('too short')) {
      return `${field === 'firstName' ? 'Le prénom' : field === 'lastName' ? 'Le nom' : 'Le nom de l\'entreprise'} est trop court.`;
    }
    return message;
  }

  showError(field: 'firstName' | 'lastName' | 'company' | 'email' | 'accept', error?: string) {
    const control = this.form.get(field);
    if (!control) return false;
    const shouldShow = this.submitted || control.touched || control.dirty;
    return shouldShow && control.invalid && (!error || control.hasError(error));
  }

  ngOnDestroy() {
    if (this.successTimer !== null) {
      window.clearTimeout(this.successTimer);
    }
  }
}
