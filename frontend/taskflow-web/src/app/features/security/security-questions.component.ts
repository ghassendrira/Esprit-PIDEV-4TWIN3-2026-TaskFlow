import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'tf-security-questions',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <div class="min-h-[calc(100vh-3rem)] p-6 bg-[#0a1f0a] text-white">
      <div class="max-w-xl mx-auto">
        <div class="bg-white/5 border border-emerald-700/30 rounded-2xl p-6 text-white">
          <h2 class="text-xl font-bold mb-2">Questions de sécurité</h2>
          <p class="text-sm text-gray-300 mb-4">
            Utilisez ces informations pour la récupération de compte.
          </p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-sm text-gray-300 mb-1">Question</label>
              <select
                formControlName="question"
                class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 text-white outline-none focus:border-[#00C853] transition"
              >
                <option value="Quel est le nom de votre premier animal de compagnie ?">Quel est le nom de votre premier animal de compagnie ?</option>
                <option value="Quelle est votre ville natale ?">Quelle est votre ville natale ?</option>
                <option value="Quel est le prénom de votre mère ?">Quel est le prénom de votre mère ?</option>
                <option value="Quel est le nom de votre école primaire ?">Quel est le nom de votre école primaire ?</option>
                <option value="Quel est votre plat préféré ?">Quel est votre plat préféré ?</option>
                <option value="Quel est le nom de votre meilleur ami d'enfance ?">Quel est le nom de votre meilleur ami d'enfance ?</option>
                <option value="Quelle est la marque de votre première voiture ?">Quelle est la marque de votre première voiture ?</option>
              </select>
            </div>

            <div>
              <label class="block text-sm text-gray-300 mb-1">Réponse</label>
              <div class="relative">
                <input
                  [type]="showAnswer ? 'text' : 'password'"
                  formControlName="answer"
                  class="w-full rounded-lg bg-[#0f2a20] border border-transparent px-3 py-2 pr-12 text-white placeholder-gray-400 outline-none focus:border-[#00C853] transition"
                />
                <button type="button"
                        (click)="showAnswer = !showAnswer"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#00C853]">
                  {{ showAnswer ? '🙈' : '👁️' }}
                </button>
              </div>
              <p class="text-xs text-emerald-200/80 mt-2">
                Votre réponse sera chiffrée et stockée de manière sécurisée.
              </p>
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
              <span *ngIf="!isSubmitting">Enregistrer</span>
              <span *ngIf="isSubmitting">...</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class SecurityQuestionsComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  isSubmitting = false;
  showAnswer = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  form: FormGroup = this.fb.group({
    question: [
      'Quel est le nom de votre premier animal de compagnie ?',
      [Validators.required, Validators.minLength(3)],
    ],
    answer: ['', [Validators.required, Validators.minLength(2)]],
  });

  onSubmit() {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = null;
    this.successMessage = null;

    const payload = this.form.value as { question: string; answer: string };

    this.auth.setSecurityQuestions(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.successMessage = 'Questions de sécurité enregistrées.';
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message ?? err?.message ?? "Erreur lors de l'enregistrement";
      },
    });
  }
}

