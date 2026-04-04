import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'tf-forgot-password',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, RouterLink],
  template: `
    <div class="min-h-screen grid place-items-center p-6 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(232,236,255,0.5)_42%,_var(--tf-surface-2)_100%)]">
      <div class="relative w-[min(460px,94vw)] tf-card rounded-[28px] p-7 sm:p-8 text-[var(--tf-on-surface)] shadow-[0_24px_80px_rgba(15,23,42,0.12)] border border-[var(--tf-border)] overflow-hidden">
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600"></div>
        <button
          type="button"
          routerLink="/auth/login"
          class="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-[var(--tf-border)] bg-[var(--tf-card)] px-3 py-2 text-sm font-medium text-[var(--tf-on-surface)] transition hover:bg-[var(--tf-surface-2)]"
          aria-label="Retour à la page de connexion"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
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

        <div class="flex flex-col items-center text-center pt-2 pb-6">
          <div class="inline-flex items-center gap-2 rounded-full border border-[var(--tf-border)] bg-[var(--tf-surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--tf-muted)] mb-5">
            Taskflow Secure Access
          </div>
          <img src="/TASKFLOW-removebg-preview.png" alt="TaskFlow" class="h-24 sm:h-28 w-auto max-w-[340px] object-contain drop-shadow-sm" />
          <div class="mt-4 text-2xl font-bold tracking-tight">Mot de passe oublié</div>
          <p class="mt-2 text-sm text-[var(--tf-muted)] max-w-sm leading-6">
            Entrez votre email pour commencer la récupération.
          </p>
        </div>

        <!-- Étape 1 : Email -->
        <div *ngIf="step() === 1" class="space-y-4">
          <div>
            <label class="block text-sm text-[var(--tf-muted)] mb-1">Email</label>
            <input type="email" [(ngModel)]="email" required maxlength="254" placeholder="votre@email.com" class="w-full rounded-lg bg-[var(--tf-surface)] border border-[var(--tf-border)] px-3 py-2 text-[var(--tf-on-surface)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition" />
          </div>
          <div *ngIf="errorMessage" class="text-sm text-red-300">{{ errorMessage }}</div>
          <button (click)="checkEmail()" class="w-full rounded-xl px-4 py-3 bg-[var(--tf-primary)] text-white dark:text-slate-900 font-semibold disabled:opacity-50 shadow-[0_10px_30px_rgba(99,102,241,0.25)] transition hover:brightness-105" [disabled]="!email || loading">
            {{ loading ? 'Chargement...' : 'Continuer' }}
          </button>
        </div>

        <!-- Étape 1.5 : Choix de la méthode -->
        <div *ngIf="step() === 1.5" class="space-y-4 animate-in fade-in duration-300">
          <h2 class="text-lg font-bold mb-1">Choisir une méthode</h2>
          <p class="text-sm text-[var(--tf-muted)] mb-4">Comment souhaitez-vous réinitialiser votre mot de passe ?</p>
          
          <div class="grid grid-cols-1 gap-3">
            <!-- Option 1: Questions de Sécurité -->
            <button *ngIf="hasQuestions" (click)="chooseMethod('questions')" 
                    class="flex items-center gap-4 p-4 rounded-xl bg-[var(--tf-surface-2)] border border-[var(--tf-border)] hover:brightness-95 transition-all text-left group">
              <div class="w-10 h-10 rounded-full bg-[var(--tf-card)] border border-[var(--tf-border)] flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🛡️</div>
              <div>
                <p class="font-bold text-sm">Questions de sécurité</p>
                <p class="text-xs text-[var(--tf-muted)]">Répondre aux questions configurées.</p>
              </div>
            </button>

            <!-- Option 2: Email -->
            <button (click)="chooseMethod('email')" 
                    class="flex items-center gap-4 p-4 rounded-xl bg-[var(--tf-surface-2)] border border-[var(--tf-border)] hover:brightness-95 transition-all text-left group">
              <div class="w-10 h-10 rounded-full bg-[var(--tf-card)] border border-[var(--tf-border)] flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📧</div>
              <div>
                <p class="font-bold text-sm">Lien par email</p>
                <p class="text-xs text-[var(--tf-muted)]">Recevoir un lien de réinitialisation.</p>
              </div>
            </button>

            <!-- Option 3: Contact Admin -->
            <button (click)="chooseMethod('admin')" 
                    class="flex items-center gap-4 p-4 rounded-xl bg-[var(--tf-surface-2)] border border-[var(--tf-border)] hover:brightness-95 transition-all text-left group">
              <div class="w-10 h-10 rounded-full bg-[var(--tf-card)] border border-[var(--tf-border)] flex items-center justify-center text-xl group-hover:scale-110 transition-transform">👨‍💼</div>
              <div>
                <p class="font-bold text-sm">Contacter l'administrateur</p>
                <p class="text-xs text-[var(--tf-muted)]">Demander de l'aide au Super Admin.</p>
              </div>
            </button>
          </div>

          <button (click)="step.set(1)" class="w-full mt-2 text-sm text-[var(--tf-muted)] hover:text-[var(--tf-on-surface)] transition-colors">
            ← Retour
          </button>
        </div>

        <!-- Étape 2 : Questions de sécurité -->
        <div *ngIf="step() === 2" class="space-y-4">
          <h2 class="text-lg font-bold mb-1">Questions de sécurité</h2>
          <p class="text-sm text-[var(--tf-muted)] mb-4">Vérifiez votre identité en répondant à vos questions.</p>
          
          <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div *ngFor="let q of securityQuestions; let i = index" class="p-4 rounded-xl bg-[var(--tf-surface-2)] border border-[var(--tf-border)]">
              <h3 class="text-[var(--tf-primary)] font-medium mb-2">{{ q }}</h3>
              <input type="text" [(ngModel)]="answers[i]" minlength="2" maxlength="120" placeholder="Votre réponse" class="w-full rounded-lg bg-[var(--tf-surface)] border border-[var(--tf-border)] px-3 py-2 text-[var(--tf-on-surface)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition" />
            </div>
          </div>

          <div *ngIf="errorMessage" class="text-sm text-red-300">{{ errorMessage }}</div>
          <div class="flex gap-3">
            <button (click)="step.set(1.5)" class="flex-1 rounded-lg px-4 py-2 border border-[var(--tf-border)] text-sm hover:bg-[var(--tf-surface-2)] transition-all">Retour</button>
            <button (click)="verifyAnswers()" class="flex-2 rounded-lg px-4 py-2 bg-[var(--tf-primary)] text-white dark:text-slate-900 font-semibold disabled:opacity-50" [disabled]="!allAnswersProvided || loading">
              {{ loading ? 'Vérification...' : 'Vérifier' }}
            </button>
          </div>
        </div>

        <!-- Étape 2.5 : Envoi Email / Contact Admin Success -->
        <div *ngIf="step() === 2.5" class="text-center py-6 space-y-4 animate-in zoom-in duration-300">
          <div class="w-16 h-16 rounded-full bg-[var(--tf-surface-2)] border border-[var(--tf-border)] text-[var(--tf-primary)] flex items-center justify-center mx-auto text-3xl">
            📬
          </div>
          <h2 class="text-xl font-bold">{{ successTitle }}</h2>
          <p class="text-[var(--tf-muted)] text-sm">{{ successMessage }}</p>
          <button (click)="goToLogin()" class="w-full mt-6 rounded-lg px-4 py-2 bg-[var(--tf-primary)] text-white dark:text-slate-900 font-semibold">
            Retour
          </button>
        </div>

        <!-- Étape 3 : Nouveau mot de passe -->
        <div *ngIf="step() === 3" class="space-y-4">
          <h2 class="text-lg font-bold mb-1">Nouveau mot de passe</h2>
          <p class="text-sm text-[var(--tf-muted)] mb-4">Créez un nouveau mot de passe sécurisé.</p>
          
          <div class="space-y-3">
            <div>
              <label class="block text-sm text-[var(--tf-muted)] mb-1">Nouveau mot de passe</label>
              <input type="password" [(ngModel)]="newPassword" minlength="8" maxlength="128" placeholder="••••••••" class="w-full rounded-lg bg-[var(--tf-surface)] border border-[var(--tf-border)] px-3 py-2 text-[var(--tf-on-surface)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition" />
            </div>
            <div>
              <label class="block text-sm text-[var(--tf-muted)] mb-1">Confirmer le mot de passe</label>
              <input type="password" [(ngModel)]="confirmPassword" minlength="8" maxlength="128" placeholder="••••••••" class="w-full rounded-lg bg-[var(--tf-surface)] border border-[var(--tf-border)] px-3 py-2 text-[var(--tf-on-surface)] outline-none focus:ring-2 focus:ring-[var(--tf-primary)] focus:border-transparent transition" />
            </div>

            <!-- Validation Rules -->
            <div class="space-y-1 py-2">
              <div class="text-xs flex items-center gap-2" [class.text-primary-500]="newPassword.length >= 8" [class.text-slate-400]="newPassword.length < 8">
                <span class="text-[10px]">{{ newPassword.length >= 8 ? '✓' : '○' }}</span> 8 caractères minimum
              </div>
              <div class="text-xs flex items-center gap-2" [class.text-primary-500]="hasUpper" [class.text-slate-400]="!hasUpper">
                <span class="text-[10px]">{{ hasUpper ? '✓' : '○' }}</span> Une majuscule
              </div>
              <div class="text-xs flex items-center gap-2" [class.text-primary-500]="hasLower" [class.text-slate-400]="!hasLower">
                <span class="text-[10px]">{{ hasLower ? '✓' : '○' }}</span> Une minuscule
              </div>
              <div class="text-xs flex items-center gap-2" [class.text-primary-500]="hasNumber" [class.text-slate-400]="!hasNumber">
                <span class="text-[10px]">{{ hasNumber ? '✓' : '○' }}</span> Un chiffre
              </div>
              <div class="text-xs flex items-center gap-2" [class.text-primary-500]="passwordsMatch && confirmPassword" [class.text-slate-400]="!passwordsMatch || !confirmPassword">
                <span class="text-[10px]">{{ passwordsMatch && confirmPassword ? '✓' : '○' }}</span> Mots de passe identiques
              </div>
            </div>
          </div>

          <div *ngIf="errorMessage" class="text-sm text-red-300">{{ errorMessage }}</div>
          <button (click)="resetPassword()" class="w-full rounded-lg px-4 py-2 bg-[var(--tf-primary)] text-white dark:text-slate-900 font-semibold disabled:opacity-50" [disabled]="!canSubmitReset || loading">
            {{ loading ? 'Réinitialisation...' : 'Réinitialiser' }}
          </button>
        </div>

        <!-- Étape 4 : Succès -->
        <div *ngIf="step() === 4" class="text-center py-6 space-y-4 animate-in fade-in duration-500">
          <div class="w-16 h-16 rounded-full bg-[var(--tf-surface-2)] border border-[var(--tf-border)] text-[var(--tf-primary)] flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <h2 class="text-xl font-bold">Succès !</h2>
          <p class="text-[var(--tf-muted)]">Mot de passe réinitialisé avec succès.</p>
          <p class="text-sm text-[var(--tf-muted)] mt-4">
            Redirection vers la page de connexion dans {{ countdown() }} secondes...
          </p>
          <button (click)="goToLogin()" class="w-full mt-4 text-sm text-[var(--tf-primary)] hover:underline">
            Se connecter maintenant
          </button>
        </div>

      </div>
    </div>
  `,
})
export class ForgotPasswordComponent implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  protected theme = inject(ThemeService);

  step = signal(1);
  email = '';
  answers: string[] = [];
  securityQuestions: string[] = [];
  hasQuestions = false;
  newPassword = '';
  confirmPassword = '';
  resetToken = '';
  
  loading = false;
  errorMessage: string | null = null;
  successTitle = '';
  successMessage = '';
  countdown = signal(3);
  private timer: any;

  toggleTheme() {
    this.theme.toggle();
  }

  get hasUpper() { return /[A-Z]/.test(this.newPassword); }
  get hasLower() { return /[a-z]/.test(this.newPassword); }
  get hasNumber() { return /[0-9]/.test(this.newPassword); }
  get hasSpecial() { return /[^A-Za-z0-9]/.test(this.newPassword); }
  get passwordsMatch() { return this.newPassword === this.confirmPassword; }
  
  get canSubmitReset() {
    return this.newPassword.length >= 8 && 
           this.hasUpper && 
           this.hasLower && 
          this.hasNumber && 
          this.hasSpecial &&
           this.passwordsMatch;
  }

  get allAnswersProvided() {
    return this.securityQuestions.length > 0 && 
           this.answers.length === this.securityQuestions.length && 
           this.answers.every(a => (a || '').trim().length >= 2);
  }

  checkEmail() {
    const email = this.email.trim();
    if (!email || this.loading) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.errorMessage = 'Veuillez saisir une adresse email valide.';
      return;
    }
    this.loading = true;
    this.errorMessage = null;

    this.auth.forgotPassword({ email }).subscribe({
      next: (res) => {
        this.loading = false;
        this.hasQuestions = res?.hasSecurityQuestions ?? false;
        this.securityQuestions = res?.questions ?? [];
        this.answers = new Array(this.securityQuestions.length).fill('');
        this.step.set(1.5); // Move to selection step
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = "Email introuvable";
      },
    });
  }

  chooseMethod(method: 'questions' | 'email' | 'admin') {
    if (method === 'questions') {
      this.step.set(2);
    } else if (method === 'email') {
      this.sendEmail();
    } else if (method === 'admin') {
      this.contactAdmin();
    }
  }

  sendEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.errorMessage = 'Veuillez saisir une adresse email valide.';
      return;
    }
    this.loading = true;
    this.auth.forgotPasswordEmail(this.email.trim()).subscribe({
      next: (res) => {
        this.loading = false;
        this.successTitle = 'Email Envoyé';
        this.successMessage = 'Un lien de réinitialisation a été envoyé à votre adresse email.';
        this.step.set(2.5);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = "Erreur lors de l'envoi de l'email";
      }
    });
  }

  contactAdmin() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.errorMessage = 'Veuillez saisir une adresse email valide.';
      return;
    }
    this.loading = true;
    this.auth.forgotPasswordContactAdmin(this.email.trim()).subscribe({
      next: (res) => {
        this.loading = false;
        this.successTitle = 'Demande Envoyée';
        this.successMessage = "Votre demande a été transmise au Super Admin. Vous recevrez une notification bientôt.";
        this.step.set(2.5);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = "Erreur lors du contact de l'administrateur";
      }
    });
  }

  async verifyAnswers() {
    if (!this.allAnswersProvided || this.loading) return;
    this.loading = true;
    this.errorMessage = null;

    try {
      let lastToken = '';
      // Verify each question/answer pair sequentially to avoid race conditions in the DB
      for (let i = 0; i < this.securityQuestions.length; i++) {
        const res = await this.auth.verifySecurityAnswer({ 
          email: this.email, 
          question: this.securityQuestions[i], 
          answer: this.answers[i] 
        }).toPromise();
        if (res) lastToken = res.resetToken;
      }

      this.loading = false;
      this.resetToken = lastToken;
      this.step.set(3);
    } catch (err) {
      this.loading = false;
      this.errorMessage = "Une ou plusieurs réponses sont incorrectes";
    }
  }

  resetPassword() {
    if (!this.canSubmitReset || this.loading) return;
    this.loading = true;
    this.errorMessage = null;

    this.auth.resetPassword({
      resetToken: this.resetToken,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.loading = false;
        this.step.set(4);
        this.startCountdown();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message ?? "Erreur lors de la réinitialisation";
      }
    });
  }

  startCountdown() {
    this.timer = setInterval(() => {
      this.countdown.update(v => v - 1);
      if (this.countdown() <= 0) {
        this.goToLogin();
      }
    }, 1000);
  }

  goToLogin() {
    if (this.timer) clearInterval(this.timer);
    this.router.navigate(['/auth/login']);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

