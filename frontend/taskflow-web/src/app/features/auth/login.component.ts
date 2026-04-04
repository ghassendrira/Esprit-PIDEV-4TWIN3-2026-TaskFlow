import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService, Role } from '../../core/services/auth.service';

@Component({
  selector: 'tf-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, NgIf],
  template: `
    <div class="min-h-screen grid place-items-center p-6 bg-gradient-to-b from-black to-[#0a2e1f]">
      <div class="w-[min(420px,92vw)] rounded-2xl p-6 border border-emerald-700/30 bg-[#0d1f17] text-white shadow-[0_0_0_1px_rgba(0,200,83,.15),0_15px_50px_rgba(0,200,83,.08)]">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-6 h-6 rounded bg-[#00C853]"></div>
          <div class="font-semibold tracking-wide">TaskFlow</div>
        </div>

        <!-- Normal Login Form -->
        <form *ngIf="!show2faInput" class="space-y-4 mt-3" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div>
            <label class="block text-sm text-gray-300 mb-1">Email</label>
            <input type="email" formControlName="email" required
                   class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white placeholder-gray-400 outline-none focus:border-[#00C853] transition"/>
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-1">Mot de passe</label>
            <div class="relative">
              <input [type]="showPwd ? 'text' : 'password'" formControlName="password" required
                     class="w-full h-12 rounded-xl bg-[#0f2a20] border border-transparent px-4 pr-12 text-white placeholder-gray-400 outline-none focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,.15)] transition"/>
              <button type="button" (click)="showPwd = !showPwd" aria-label="Afficher le mot de passe"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#00C853] transition-colors duration-200 cursor-pointer">
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
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" class="rounded border-gray-500 bg-[#0f2a20] accent-[#00C853]"/>
              Se souvenir de moi
            </label>
            <a routerLink="/forgot-password" class="text-[#00C853] text-sm hover:underline">Mot de passe oublié ?</a>
          </div>
          <div *ngIf="errorMessage as err"
               class="rounded-lg px-3 py-2 text-sm"
               [class.bg-red-900/40]="true"
               [class.border]="true"
               [class.border-red-700/40]="true"
               [class.text-red-200]="true">
            <span *ngIf="err.toLowerCase().includes('bloqué') || err.toLowerCase().includes('blocked')">🔒 </span>{{ err }}
          </div>
          <button class="w-full rounded-lg px-4 py-2 bg-[#00C853] text-black font-semibold hover:shadow-[0_0_0_3px_rgba(0,200,83,.35)] hover:scale-[1.02] transition disabled:opacity-50" [disabled]="form.invalid || lockoutActive">
            Se connecter
          </button>
        </form>

        <!-- 2FA OTP Form -->
        <div *ngIf="show2faInput" class="space-y-6 mt-6 animate-in zoom-in duration-200 text-center">
          <div class="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">📱</span>
          </div>
          <h3 class="text-xl font-bold">Vérification 2FA</h3>
          <p class="text-sm text-gray-400">Entrez le code à 6 chiffres de votre application Google Authenticator.</p>
          
          <div class="space-y-4 text-left">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Code de vérification</label>
            <input [(ngModel)]="otpCode" 
                   placeholder="000000" 
                   maxlength="6"
                   class="w-full h-14 rounded-xl bg-[#0f2a20] border border-emerald-500/10 px-4 text-2xl text-center tracking-[0.5em] text-white outline-none focus:border-[#00C853] transition-all font-mono"/>
            
            <div *ngIf="errorMessage as err" class="text-red-400 text-xs text-center">{{ err }}</div>

            <div class="flex gap-4 pt-4">
              <button (click)="show2faInput = false" class="flex-1 h-11 rounded-xl border border-emerald-800 text-sm hover:bg-emerald-900/20 transition-all">Retour</button>
              <button (click)="onVerify2fa()" 
                      [disabled]="otpCode.length !== 6 || isVerifying2fa"
                      class="flex-1 h-11 rounded-xl bg-[#00C853] text-black font-bold text-sm transition-all shadow-lg shadow-emerald-900/20">
                {{ isVerifying2fa ? 'Vérification...' : 'Vérifier' }}
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="!show2faInput" class="text-sm text-gray-300 mt-4 text-center">
          Pas encore de compte ?
          <a class="text-[#00C853] hover:underline" routerLink="/auth/register">S'inscrire</a>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  showPwd = false;
  errorMessage: string | null = null;
  lockoutActive = false;
  private unlockTimer: any = null;

  // 2FA
  show2faInput = false;
  otpCode = '';
  userId = '';
  isVerifying2fa = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.form.invalid || this.lockoutActive) return;
    this.errorMessage = null;
    const email = this.form.value.email!;
    const password = this.form.value.password!;
    this.auth.signin({ email, password }).subscribe({
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
        const msg = err?.error?.message ?? err?.message ?? 'Erreur de connexion';
        this.errorMessage = msg;
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
        this.errorMessage = err?.error?.message || 'Code OTP invalide';
      }
    });
  }
}

