import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'tf-forgot-password',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor],
  template: `
    <div class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-black to-[#0a2e1f]">
      <div class="w-[min(420px,92vw)] rounded-2xl p-6 border border-emerald-700/30 bg-[#0d1f17] text-white shadow-[0_0_0_1px_rgba(0,200,83,.15),0_15px_50px_rgba(0,200,83,.08)]">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-6 h-6 rounded bg-[#00C853]"></div>
          <div class="font-semibold tracking-wide">TaskFlow</div>
        </div>

        <!-- Étape 1 : Email -->
        <div *ngIf="step() === 1" class="space-y-4">
          <h2 class="text-lg font-bold mb-1">Mot de passe oublié</h2>
          <p class="text-sm text-gray-300 mb-4">Entrez votre email pour commencer la récupération.</p>
          <div>
            <label class="block text-sm text-gray-300 mb-1">Email</label>
            <input type="email" [(ngModel)]="email" placeholder="votre@email.com" class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white outline-none focus:border-[#00C853] transition" />
          </div>
          <div *ngIf="errorMessage" class="text-sm text-red-300">{{ errorMessage }}</div>
          <button (click)="checkEmail()" class="w-full rounded-lg px-4 py-2 bg-[#00C853] text-black font-semibold disabled:opacity-50" [disabled]="!email || loading">
            {{ loading ? 'Chargement...' : 'Continuer' }}
          </button>
        </div>

        <!-- Étape 1.5 : Choix de la méthode -->
        <div *ngIf="step() === 1.5" class="space-y-4 animate-in fade-in duration-300">
          <h2 class="text-lg font-bold mb-1">Choisir une méthode</h2>
          <p class="text-sm text-gray-300 mb-4">Comment souhaitez-vous réinitialiser votre mot de passe ?</p>
          
          <div class="grid grid-cols-1 gap-3">
            <!-- Option 1: Questions de Sécurité -->
            <button *ngIf="hasQuestions" (click)="chooseMethod('questions')" 
                    class="flex items-center gap-4 p-4 rounded-xl bg-[#113a13] border border-emerald-500/20 hover:bg-[#1a4d1c] transition-all text-left group">
              <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🛡️</div>
              <div>
                <p class="font-bold text-sm">Questions de sécurité</p>
                <p class="text-xs text-gray-400">Répondre aux questions configurées.</p>
              </div>
            </button>

            <!-- Option 2: Email -->
            <button (click)="chooseMethod('email')" 
                    class="flex items-center gap-4 p-4 rounded-xl bg-[#113a13] border border-emerald-500/20 hover:bg-[#1a4d1c] transition-all text-left group">
              <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📧</div>
              <div>
                <p class="font-bold text-sm">Lien par email</p>
                <p class="text-xs text-gray-400">Recevoir un lien de réinitialisation.</p>
              </div>
            </button>

            <!-- Option 3: Contact Admin -->
            <button (click)="chooseMethod('admin')" 
                    class="flex items-center gap-4 p-4 rounded-xl bg-[#113a13] border border-emerald-500/20 hover:bg-[#1a4d1c] transition-all text-left group">
              <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">👨‍💼</div>
              <div>
                <p class="font-bold text-sm">Contacter l'administrateur</p>
                <p class="text-xs text-gray-400">Demander de l'aide au Super Admin.</p>
              </div>
            </button>
          </div>

          <button (click)="step.set(1)" class="w-full mt-2 text-sm text-gray-400 hover:text-white transition-colors">
            ← Retour
          </button>
        </div>

        <!-- Étape 2 : Questions de sécurité -->
        <div *ngIf="step() === 2" class="space-y-4">
          <h2 class="text-lg font-bold mb-1">Questions de sécurité</h2>
          <p class="text-sm text-gray-300 mb-4">Vérifiez votre identité en répondant à vos questions.</p>
          
          <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div *ngFor="let q of securityQuestions; let i = index" class="p-4 rounded-xl bg-[#113a13] border border-emerald-500/20">
              <h3 class="text-emerald-400 font-medium mb-2">{{ q }}</h3>
              <input type="text" [(ngModel)]="answers[i]" placeholder="Votre réponse" class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white outline-none focus:border-[#00C853] transition" />
            </div>
          </div>

          <div *ngIf="errorMessage" class="text-sm text-red-300">{{ errorMessage }}</div>
          <div class="flex gap-3">
            <button (click)="step.set(1.5)" class="flex-1 rounded-lg px-4 py-2 border border-emerald-800 text-sm hover:bg-emerald-900/20 transition-all">Retour</button>
            <button (click)="verifyAnswers()" class="flex-2 rounded-lg px-4 py-2 bg-[#00C853] text-black font-semibold disabled:opacity-50" [disabled]="!allAnswersProvided || loading">
              {{ loading ? 'Vérification...' : 'Vérifier' }}
            </button>
          </div>
        </div>

        <!-- Étape 2.5 : Envoi Email / Contact Admin Success -->
        <div *ngIf="step() === 2.5" class="text-center py-6 space-y-4 animate-in zoom-in duration-300">
          <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto text-3xl">
            📬
          </div>
          <h2 class="text-xl font-bold text-white">{{ successTitle }}</h2>
          <p class="text-emerald-400 text-sm">{{ successMessage }}</p>
          <button (click)="goToLogin()" class="w-full mt-6 rounded-lg px-4 py-2 bg-[#00C853] text-black font-semibold">
            Retour à la connexion
          </button>
        </div>

        <!-- Étape 3 : Nouveau mot de passe -->
        <div *ngIf="step() === 3" class="space-y-4">
          <h2 class="text-lg font-bold mb-1">Nouveau mot de passe</h2>
          <p class="text-sm text-gray-300 mb-4">Créez un nouveau mot de passe sécurisé.</p>
          
          <div class="space-y-3">
            <div>
              <label class="block text-sm text-gray-300 mb-1">Nouveau mot de passe</label>
              <input type="password" [(ngModel)]="newPassword" placeholder="••••••••" class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white outline-none focus:border-[#00C853] transition" />
            </div>
            <div>
              <label class="block text-sm text-gray-300 mb-1">Confirmer le mot de passe</label>
              <input type="password" [(ngModel)]="confirmPassword" placeholder="••••••••" class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white outline-none focus:border-[#00C853] transition" />
            </div>

            <!-- Validation Rules -->
            <div class="space-y-1 py-2">
              <div class="text-xs flex items-center gap-2" [class.text-emerald-400]="newPassword.length >= 8" [class.text-gray-500]="newPassword.length < 8">
                <span class="text-[10px]">{{ newPassword.length >= 8 ? '✓' : '○' }}</span> 8 caractères minimum
              </div>
              <div class="text-xs flex items-center gap-2" [class.text-emerald-400]="hasUpper" [class.text-gray-500]="!hasUpper">
                <span class="text-[10px]">{{ hasUpper ? '✓' : '○' }}</span> Une majuscule
              </div>
              <div class="text-xs flex items-center gap-2" [class.text-emerald-400]="hasLower" [class.text-gray-500]="!hasLower">
                <span class="text-[10px]">{{ hasLower ? '✓' : '○' }}</span> Une minuscule
              </div>
              <div class="text-xs flex items-center gap-2" [class.text-emerald-400]="hasNumber" [class.text-gray-500]="!hasNumber">
                <span class="text-[10px]">{{ hasNumber ? '✓' : '○' }}</span> Un chiffre
              </div>
              <div class="text-xs flex items-center gap-2" [class.text-emerald-400]="passwordsMatch && confirmPassword" [class.text-gray-500]="!passwordsMatch || !confirmPassword">
                <span class="text-[10px]">{{ passwordsMatch && confirmPassword ? '✓' : '○' }}</span> Mots de passe identiques
              </div>
            </div>
          </div>

          <div *ngIf="errorMessage" class="text-sm text-red-300">{{ errorMessage }}</div>
          <button (click)="resetPassword()" class="w-full rounded-lg px-4 py-2 bg-[#00C853] text-black font-semibold disabled:opacity-50" [disabled]="!canSubmitReset || loading">
            {{ loading ? 'Réinitialisation...' : 'Réinitialiser' }}
          </button>
        </div>

        <!-- Étape 4 : Succès -->
        <div *ngIf="step() === 4" class="text-center py-6 space-y-4 animate-in fade-in duration-500">
          <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <h2 class="text-xl font-bold text-white">Succès !</h2>
          <p class="text-emerald-400">Mot de passe réinitialisé avec succès.</p>
          <p class="text-sm text-gray-400 mt-4">
            Redirection vers la page de connexion dans {{ countdown() }} secondes...
          </p>
          <button (click)="goToLogin()" class="w-full mt-4 text-sm text-[#00C853] hover:underline">
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

  get hasUpper() { return /[A-Z]/.test(this.newPassword); }
  get hasLower() { return /[a-z]/.test(this.newPassword); }
  get hasNumber() { return /[0-9]/.test(this.newPassword); }
  get passwordsMatch() { return this.newPassword === this.confirmPassword; }
  
  get canSubmitReset() {
    return this.newPassword.length >= 8 && 
           this.hasUpper && 
           this.hasLower && 
           this.hasNumber && 
           this.passwordsMatch;
  }

  get allAnswersProvided() {
    return this.securityQuestions.length > 0 && 
           this.answers.length === this.securityQuestions.length && 
           this.answers.every(a => !!a);
  }

  checkEmail() {
    if (!this.email || this.loading) return;
    this.loading = true;
    this.errorMessage = null;

    this.auth.forgotPassword({ email: this.email }).subscribe({
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
    this.loading = true;
    this.auth.forgotPasswordEmail(this.email).subscribe({
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
    this.loading = true;
    this.auth.forgotPasswordContactAdmin(this.email).subscribe({
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

