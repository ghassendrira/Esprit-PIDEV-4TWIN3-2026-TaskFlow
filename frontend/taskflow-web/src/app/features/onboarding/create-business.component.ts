import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { OnboardingService } from '../../core/services/onboarding.service';
import { OnboardingLayoutComponent } from './onboarding.layout';

@Component({
  selector: 'tf-create-business',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, OnboardingLayoutComponent],
  template: `
    <tf-onboarding-layout>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex-1 flex items-center justify-center gap-10">
            <div class="flex flex-col items-center">
              <div class="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white">✓</div>
              <div class="text-xs mt-1">Company Info</div>
            </div>
            <div class="h-[2px] w-24 bg-primary-600/70"></div>
            <div class="flex flex-col items-center">
              <div class="w-6 h-6 rounded-full bg-primary-600"></div>
              <div class="text-xs mt-1">Your Business</div>
            </div>
          </div>
        </div>

        <div class="text-center mb-4">
          <div class="text-3xl">💼</div>
          <div class="text-lg font-semibold mt-1">Create Your First Business</div>
          <div class="text-sm muted">You can add more businesses later from settings.</div>
        </div>

        <form class="space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div>
            <label class="block text-sm mb-1">Business Name <span class="text-red-500">*</span></label>
            <input formControlName="name" minlength="2" maxlength="120" placeholder="Nom de votre entreprise" class="w-full h-11 rounded-xl border px-4 outline-none transition focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" style="background: var(--tf-surface); border-color: var(--tf-border); color: var(--tf-on-surface);" [class.border-red-500]="(form.get('name')?.touched || submitted) && form.get('name')?.invalid" autofocus/>
            <div *ngIf="(form.get('name')?.touched || submitted) && form.get('name')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom de l'entreprise est obligatoire.</div>
            <div *ngIf="(form.get('name')?.touched || submitted) && form.get('name')?.errors?.['minlength']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom de l'entreprise doit contenir au moins 2 caractères.</div>
          </div>
          <div>
            <label class="block text-sm mb-1">Currency <span class="text-red-500">*</span></label>
            <select formControlName="currency" class="w-full h-11 rounded-xl border px-4 outline-none transition focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" style="background: var(--tf-surface); border-color: var(--tf-border); color: var(--tf-on-surface);" [class.border-red-500]="(form.get('currency')?.touched || submitted) && form.get('currency')?.invalid">
              <option value="TND">TND 🇹🇳</option>
              <option value="USD">USD 🇺🇸</option>
              <option value="EUR">EUR 🇪🇺</option>
              <option value="GBP">GBP 🇬🇧</option>
            </select>
            <div *ngIf="(form.get('currency')?.touched || submitted) && form.get('currency')?.errors?.['required']" class="text-red-400 text-xs mt-1">La devise est requise</div>
            <div class="text-xs muted mt-1">Auto-selected based on your country</div>
          </div>
          <div>
            <label class="block text-sm mb-1">Default Tax Rate (%) <span class="text-red-500">*</span></label>
            <input type="number" formControlName="taxRate" min="0" max="100" step="0.5" class="w-full h-11 rounded-xl border px-4 outline-none transition focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" style="background: var(--tf-surface); border-color: var(--tf-border); color: var(--tf-on-surface);" [class.border-red-500]="(form.get('taxRate')?.touched || submitted) && form.get('taxRate')?.invalid"/>
            <div *ngIf="(form.get('taxRate')?.touched || submitted) && form.get('taxRate')?.errors?.['required']" class="text-red-400 text-xs mt-1">Le taux de taxe est requis</div>
            <div *ngIf="(form.get('taxRate')?.touched || submitted) && (form.get('taxRate')?.errors?.['min'] || form.get('taxRate')?.errors?.['max'])" class="text-red-400 text-xs mt-1">Le taux doit être entre 0 et 100</div>
          </div>
          <div>
            <label class="block text-sm mb-1">Business Logo URL</label>
            <input formControlName="logoUrl" placeholder="https://yourlogo.com/logo.png" class="w-full h-11 rounded-xl border px-4 outline-none transition focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" style="background: var(--tf-surface); border-color: var(--tf-border); color: var(--tf-on-surface);" [class.border-red-500]="(form.get('logoUrl')?.touched || submitted) && form.get('logoUrl')?.invalid"/>
            <div *ngIf="(form.get('logoUrl')?.touched || submitted) && form.get('logoUrl')?.errors?.['pattern']" class="text-red-400 text-xs mt-1">Format d'URL invalide</div>
            <div class="text-xs muted mt-1">Optional — you can add this later</div>
          </div>

          <div *ngIf="form.valid" class="mt-3 border rounded-xl p-3 text-sm" style="border-color: var(--tf-border); background: var(--tf-surface);">
            <div class="font-semibold mb-1">📋 Review Your Business</div>
            <div>Name: {{ form.value.name }}</div>
            <div>Currency: {{ form.value.currency }}</div>
            <div>Tax Rate: {{ form.value.taxRate }}%</div>
          </div>

          <button class="w-full h-11 rounded-xl bg-[var(--tf-primary)] text-white dark:text-slate-900 font-semibold hover:brightness-95 transition disabled:opacity-50" [disabled]="form.invalid || saving">
            <span *ngIf="!saving">Create Business & Go to Dashboard</span>
            <span *ngIf="saving">Creating...</span>
          </button>

          <div *ngIf="errorMessage" class="text-red-400 text-sm">{{ errorMessage }}</div>
        </form>
      </div>
    </tf-onboarding-layout>
  `,
})
export class CreateBusinessComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private api = inject(OnboardingService);
  saving = false;
  submitted = false;
  errorMessage: string | null = null;
  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    currency: ['TND', Validators.required],
    taxRate: [19, [Validators.required, Validators.min(0), Validators.max(100)]],
    logoUrl: ['', [Validators.pattern(/^(https?:\/\/|data:image\/).+/i)]],
  });
  ngOnInit() {
    try {
      const raw = localStorage.getItem('onboarding-country');
      if (raw) {
        const c = JSON.parse(raw) as { currency: string; taxRate: number };
        this.form.patchValue({ currency: c.currency, taxRate: c.taxRate });
      }
    } catch {}
  }
  onSubmit() {
    this.submitted = true;
    console.log('--- Formulaire Créer Business ---');
    console.log('Valide:', this.form.valid);
    console.log('Valeurs:', this.form.value);
    
    if (this.form.invalid) {
      console.log('Erreurs:', this.getFormErrors());
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const { name, logoUrl, currency, taxRate } = this.form.value;
    this.api.createBusiness({ name: name!, logoUrl: logoUrl!, currency: currency!, taxRate: Number(taxRate) }).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.saving = false;
        this.errorMessage = 'Failed to create business. Please try again.';
      }
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
