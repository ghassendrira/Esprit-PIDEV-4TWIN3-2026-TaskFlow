import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService, Role } from '../../core/services/auth.service';

@Component({
  selector: 'tf-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIf],
  template: `
    <div class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-black to-[#0a2e1f]">
      <div class="relative w-[min(480px,92vw)] rounded-2xl p-6 border border-emerald-700/30 bg-[#0d1f17] text-white shadow-[0_0_0_1px_rgba(0,200,83,.15),0_15px_50px_rgba(0,200,83,.08)]">
        <button routerLink="/auth/login" class="absolute left-4 top-4 text-gray-300 hover:text-[#00C853] transition text-sm">← Retour</button>
        <div class="flex flex-col items-center mb-4 mt-1">
          <div class="w-8 h-8 rounded bg-[#00C853]"></div>
          <div class="mt-2 font-semibold tracking-wide">TaskFlow</div>
        </div>
        <h2 class="text-xl font-bold text-center">Créer votre compte</h2>
        <div class="text-sm text-gray-300 text-center">Essai gratuit 30 jours, aucune carte requise 🎉</div>
        <form class="space-y-4 mt-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-300 mb-1">Prénom</label>
              <input formControlName="firstName" required
                     class="w-full h-12 rounded-xl bg-[#0f2a20] border border-transparent px-4 text-white placeholder-gray-400 outline-none focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,.15)] transition"/>
            </div>
            <div>
              <label class="block text-sm text-gray-300 mb-1">Nom</label>
              <input formControlName="lastName" required
                     class="w-full h-12 rounded-xl bg-[#0f2a20] border border-transparent px-4 text-white placeholder-gray-400 outline-none focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,.15)] transition"/>
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-1">Nom de l'entreprise</label>
            <input formControlName="company" required
                   class="w-full h-12 rounded-xl bg-[#0f2a20] border border-transparent px-4 text-white placeholder-gray-400 outline-none focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,.15)] transition"/>
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-1">Catégorie de l'entreprise (optionnel)</label>
            <select formControlName="companyCategory"
                    class="w-full h-12 rounded-xl bg-[#0f2a20] border border-transparent px-4 text-white outline-none focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,.15)] transition">
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
            <label class="block text-sm text-gray-300 mb-1">Email professionnel</label>
            <input type="email" formControlName="email" required
                   class="w-full h-12 rounded-xl bg-[#0f2a20] border border-transparent px-4 text-white placeholder-gray-400 outline-none focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,.15)] transition"/>
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" formControlName="accept" class="rounded border-gray-500 bg-[#0f2a20] accent-[#00C853]"/>
            J'accepte les Conditions d'utilisation
          </label>
          <button class="w-full h-12 rounded-xl px-4 bg-gradient-to-r from-[#00C853] to-[#00b64a] text-black font-semibold shadow-[0_8px_16px_rgba(0,200,83,.2)] hover:shadow-[0_12px_24px_rgba(0,200,83,.25)] hover:-translate-y-0.5 transition-transform duration-200 disabled:opacity-50"
                  [disabled]="form.invalid">
            Créer mon compte
          </button>
          <div class="flex items-center gap-3 text-gray-400 text-xs">
            <div class="flex-1 h-px bg-gray-700"></div>
            — ou s'inscrire avec —
            <div class="flex-1 h-px bg-gray-700"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" class="relative w-full h-12 rounded-[10px] bg-[#1a2e22] text-white border border-[#00C853]/30 hover:border-[#00C853] hover:bg-[#1f3a28] transition-colors duration-200 transform hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,200,83,.15)]">
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
            <button type="button" class="relative w-full h-12 rounded-[10px] bg-[#1a2e22] text-white border border-[#00C853]/30 hover:border-[#00C853] hover:bg-[#1f3a28] transition-colors duration-200 transform hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,200,83,.15)]">
              <span class="absolute left-1 top-1/2 -translate-y-1/2">
                <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.436H7.078v-3.49h3.047V9.41c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953h-1.513c-1.492 0-1.956.93-1.956 1.883v2.257h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                <path fill="#fff" d="M16.671 15.563l.532-3.49h-3.328V9.238c0-.953.464-1.883 1.956-1.883h1.513V4.402s-1.373-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.837H7.078v3.49h3.047V24h3.75v-8.437h2.796z"/>
                </svg>
              </span>
              <span class="block text-center">S'inscrire avec Facebook</span>
            </button>
            <button type="button" class="relative w-full h-12 rounded-[10px] bg-[#1a2e22] text-white border border-[#00C853]/30 hover:border-[#00C853] hover:bg-[#1f3a28] transition-colors duration-200 transform hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,200,83,.15)]">
              <span class="absolute left-3 top-1/2 -translate-y-1/2">
                <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#0A66C2" d="M22.225 0H1.771C.792 0 0 .774 0 1.728v20.543C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.728C24 .774 23.2 0 22.222 0h.003z"/>
                <path fill="#fff" d="M7.07 20.452H3.558V9.018H7.07v11.434zM5.314 7.51a2.041 2.041 0 110-4.082 2.041 2.041 0 010 4.082zm15.138 12.942h-3.512v-5.56c0-1.327-.028-3.037-1.85-3.037-1.853 0-2.136 1.447-2.136 2.941v5.656H9.44V9.018h3.37v1.561h.048c.469-.889 1.613-1.828 3.32-1.828 3.551 0 4.205 2.338 4.205 5.377v6.324z"/>
                </svg>
              </span>
              <span class="block text-center">S'inscrire avec LinkedIn</span>
            </button>
            <button type="button" class="relative w-full h-12 rounded-[10px] bg-[#1a2e22] text-white border border-[#00C853]/30 hover:border-[#00C853] hover:bg-[#1f3a28] transition-colors duration-200 transform hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,200,83,.15)]">
              <span class="absolute left-3 top-1/2 -translate-y-1/2">
                <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#fff" d="M16.365 1.43c0 1.12-.422 2.153-1.117 2.987-.676.808-1.787 1.43-2.87 1.347-.13-1.1.38-2.17 1.038-2.947.673-.792 1.857-1.372 2.95-1.387zM20.97 17.186c-.057 1.555.504 3.18 1.535 4.315-.67.207-1.38.3-2.08.3-1.095 0-1.975-.218-2.62-.474-.65-.257-1.243-.598-1.8-.598-.59 0-1.23.327-1.9.593-.674.268-1.41.478-2.31.478-.76 0-1.52-.1-2.23-.32-.7-.217-1.34-.56-1.9-1.014-1.5-1.21-2.23-3.28-2.23-5.18 0-2.39.97-4.39 2.45-5.6 1.07-.86 2.4-1.38 3.71-1.38.94 0 1.8.3 2.5.56.7.25 1.2.53 1.78.53.5 0 .98-.23 1.56-.47.77-.31 1.67-.62 2.76-.62.7 0 1.39.15 2.03.46-.55.6-.99 1.34-1.22 2.14-.23.81-.21 1.7-.21 1.95z"/>
                </svg>
              </span>
              <span class="block text-center">S'inscrire avec Apple</span>
            </button>
          </div>
        </form>
        <div *ngIf="successMessage" class="text-sm text-[#86b29a] mt-4 text-center whitespace-pre-line">
          {{ successMessage }}
        </div>
        <div *ngIf="errorMessage" class="text-sm text-red-400 mt-2 text-center whitespace-pre-line">
          {{ errorMessage }}
        </div>
        <div class="text-sm text-gray-300 mt-4 text-center">
          Déjà un compte ?
          <a class="text-[#00C853] hover:underline" routerLink="/auth/login">Se connecter</a>
        </div>
        <div class="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-700/30 text-xs">
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

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    company: ['', Validators.required],
    companyCategory: [''],
    email: ['', [Validators.required, Validators.email]],
    accept: [false, Validators.requiredTrue]
  });

  successMessage: string | null = null;
  errorMessage: string | null = null;

  onSubmit() {
    if (this.form.invalid) return;
    const first = (this.form.value.firstName as string).trim();
    const last = (this.form.value.lastName as string).trim();
    const company = (this.form.value.company as string).trim();
    const email = this.form.value.email!;

    const companyCategory = (this.form.value.companyCategory as string) || undefined;

    this.auth.signup({
      firstName: first,
      lastName: last,
      email,
      companyName: company,
      companyCategory
    }).subscribe({
      next: (response: any) => {
        try {
          localStorage.setItem('companyName', company);
        } catch {}
        this.successMessage =
          'Votre demande d\'inscription a été envoyée avec succès.\n' +
          'Veuillez patienter, vous recevrez prochainement un email du Super Admin\n' +
          'contenant votre email et mot de passe pour vous connecter.';
      },
      error: (error) => {
        if (error?.status === 409) {
          this.errorMessage = 'Un compte avec cet email existe déjà';
        } else if (error?.status === 400) {
          this.errorMessage = error?.error?.message || 'Données invalides';
        } else {
          this.errorMessage = 'Une erreur serveur est survenue';
        }
      }
    });
  }
}
