import { Component, OnInit, inject, signal, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { TenantService } from '../../core/services/tenant.service';
import { ThemeService } from '../../core/services/theme.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'tf-settings',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, NgIf, NgFor],
  template: `
    <div class="flex min-h-[600px] overflow-hidden rounded-2xl border"
         style="border-color: var(--tf-border); background: var(--tf-card); color: var(--tf-on-surface);">
      <!-- Sidebar -->
      <div class="w-[240px] border-r flex flex-col p-4 bg-[var(--tf-surface-2)]"
           style="border-color: var(--tf-border);">
        <h1 class="text-lg font-semibold mb-6 px-2">Settings</h1>
        
        <!-- Tenant Switcher -->
        <div class="relative mb-4">
          <button (click)="toggleTenantDropdown()" 
                  class="w-full p-3 rounded-xl border transition-all flex items-center justify-between group hover:bg-[var(--tf-card)]"
                  style="border-color: var(--tf-border); background: var(--tf-card);">
            <div class="flex items-center gap-2 overflow-hidden">
              <div class="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                {{ currentTenant()?.name?.substring(0, 2)?.toUpperCase() }}
              </div>
              <span class="truncate font-medium text-sm">{{ currentTenant()?.name }}</span>
            </div>
            <span class="text-xs transition-transform duration-200" [class.rotate-180]="showTenantDropdown()">▼</span>
          </button>
          
          <!-- Dropdown -->
          <div *ngIf="showTenantDropdown()" 
               class="absolute top-full left-0 right-0 mt-2 py-2 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 border"
               style="background: var(--tf-card); border-color: var(--tf-border);">
            <button *ngFor="let t of allTenants" 
                    (click)="switchTenant(t.id)"
                    class="w-full px-4 py-2 hover:bg-[var(--tf-surface-2)] flex items-center gap-3 transition-colors text-left">
              <div class="w-6 h-6 rounded bg-primary-50 text-primary-700 border flex items-center justify-center text-[10px] font-bold"
                   style="border-color: var(--tf-border);">
                {{ t.name.substring(0, 2).toUpperCase() }}
              </div>
              <span class="text-sm truncate flex-1" [class.text-primary-700]="t.id === currentTenant()?.id" [class.font-semibold]="t.id === currentTenant()?.id">{{ t.name }}</span>
            </button>
          </div>
        </div>

        <!-- Add Company Button -->
        <button (click)="showTenantModal = true" 
          class="w-full mb-8 p-2 rounded-lg border border-dashed text-[10px] uppercase font-bold tracking-wider muted hover:bg-[var(--tf-card)] transition-all"
          style="border-color: var(--tf-border);">
          + New Company
        </button>

        <!-- Navigation Section: Configuration -->
        <div class="space-y-1 mb-8">
          <p class="px-2 text-[10px] font-bold uppercase tracking-widest muted mb-2">Configuration</p>
          <button (click)="tab = 'company'" 
                  class="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all text-left hover:bg-[var(--tf-card)]"
                  [class.text-primary-700]="tab === 'company'"
                  [class.bg-primary-50]="tab === 'company'"
                  [class.border-l-2]="tab === 'company'"
                  [class.border-primary-500]="tab === 'company'"
                  [class.muted]="tab !== 'company'">
            <span>🏢</span> Company profile
          </button>
          <button (click)="tab = 'security'" 
                  class="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all text-left hover:bg-[var(--tf-card)]"
                  [class.text-primary-700]="tab === 'security'"
                  [class.bg-primary-50]="tab === 'security'"
                  [class.border-l-2]="tab === 'security'"
                  [class.border-primary-500]="tab === 'security'"
                  [class.muted]="tab !== 'security'">
            <span>🛡️</span> Security
          </button>
        </div>

        <!-- Navigation Section: Businesses -->
        <div class="space-y-1">
          <p class="px-2 text-[10px] font-bold uppercase tracking-widest muted mb-2">Businesses</p>
          <button *ngFor="let b of businesses" 
                  (click)="selectBusiness(b)"
                  class="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all text-left hover:bg-[var(--tf-card)]"
                  [class.text-primary-700]="activeBusinessId === b.id"
                  [class.bg-primary-50]="activeBusinessId === b.id"
                  [class.muted]="activeBusinessId !== b.id">
            <span class="w-2 h-2 rounded-full" [style.background]="activeBusinessId === b.id ? 'var(--tf-primary)' : 'var(--tf-border)'"></span>
            <span class="truncate">{{ b.name }}</span>
          </button>
          
          <button (click)="showBusinessModal = true"
                  class="w-full mt-4 p-2 rounded-lg border border-dashed text-xs muted hover:bg-[var(--tf-card)] transition-all"
                  style="border-color: var(--tf-border);">
            + Add business
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 p-6 md:p-8 overflow-y-auto" style="background: var(--tf-card);">
        <!-- Toast Notification -->
        <div *ngIf="toast" 
             class="fixed top-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-[100] animate-in slide-in-from-right duration-300 text-white"
             [class.bg-primary-600]="toast.type === 'success'"
             [class.bg-red-600]="toast.type === 'error'">
          {{ toast.message }}
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between mb-8 pb-6 border-b" style="border-color: var(--tf-border);">
          <div>
            <h2 class="text-2xl font-bold">{{ tab === 'company' ? 'Company profile' : tab === 'security' ? 'Security' : 'Business Settings' }}</h2>
            <p class="text-sm muted">{{ currentTenant()?.name }} • {{ currentTenant()?.country }}</p>
          </div>
          <div class="flex gap-3">
            <button (click)="loadData()" class="px-4 py-2 rounded-xl border text-sm hover:bg-[var(--tf-surface-2)] transition-all"
                    style="border-color: var(--tf-border);">Cancel</button>
            <button (click)="saveAll()" 
                    [disabled]="isSavingAll"
                    class="px-6 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 font-bold text-sm transition-all text-white">
              {{ isSavingAll ? 'Saving...' : 'Save changes' }}
            </button>
          </div>
        </div>

        <div class="max-w-4xl space-y-8">
          <!-- Company Profile Tab Content -->
          <div *ngIf="tab === 'company'" class="space-y-8">
            <!-- CARD 1: Company Identity -->
            <div class="tf-card !p-6">
              <div class="flex items-center justify-between mb-6">
                <h3 class="font-bold flex items-center gap-2">
                  Company identity
                  <span class="px-2 py-0.5 rounded-full bg-primary-50 text-[10px] text-primary-700 border border-primary-100">Tenant</span>
                </h3>
              </div>

              <div class="flex items-center gap-6 mb-8 p-4 rounded-xl border"
                   style="border-color: var(--tf-border); background: var(--tf-surface);">
                <div class="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold border text-white overflow-hidden"
                     style="border-color: var(--tf-border);">
                  <img *ngIf="tenantService.logo()" [src]="tenantService.logo()" class="w-full h-full object-cover"/>
                  <span *ngIf="!tenantService.logo()">{{ companyForm.get('name')?.value?.substring(0, 2)?.toUpperCase() }}</span>
                </div>
                <div class="flex-1">
                  <h4 class="font-bold">{{ companyForm.get('name')?.value }}</h4>
                  <p class="text-xs muted">Upload a logo to appear on invoices</p>
                </div>
                <input type="file" #fileInput (change)="onLogoSelected($event)" accept="image/*" class="hidden">
                <button type="button" (click)="fileInput.click()" class="px-4 py-2 rounded-lg border text-xs font-bold hover:bg-[var(--tf-surface-2)] transition-all"
                        style="border-color: var(--tf-border);">Upload logo</button>
              </div>

              <form [formGroup]="companyForm" class="grid grid-cols-2 gap-6">
                <div class="col-span-1">
                  <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Company name</label>
                  <input formControlName="name" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                         style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Tax ID / Matricule</label>
                  <input formControlName="matricule" placeholder="e.g. 1234567/A/M/000" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                         style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
                </div>
                <div class="col-span-1 opacity-60">
                  <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Country (auto)</label>
                  <input [value]="currentTenant()?.country" readonly class="w-full h-11 rounded-xl border px-4 text-sm cursor-not-allowed outline-none"
                         style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Phone</label>
                  <input formControlName="phone" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                         style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Address</label>
                  <input formControlName="address" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                         style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
                </div>
              </form>
            </div>

            <!-- CARD 2: Active Business -->
            <div class="tf-card !p-6">
              <div class="flex items-center justify-between mb-6">
                <h3 class="font-bold flex items-center gap-2">
                  Active business settings
                  <span class="px-2 py-0.5 rounded-full bg-primary-50 text-[10px] text-primary-700 border border-primary-100">
                    {{ activeBusinessName }}
                  </span>
                </h3>
              </div>

              <form [formGroup]="businessForm" class="grid grid-cols-2 gap-6">
                <div class="col-span-1">
                  <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Business name</label>
                  <input formControlName="name" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                         style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Currency</label>
                  <select formControlName="currency" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                          style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);">
                    <option value="TND">TND 🇹🇳</option>
                    <option value="USD">USD 🇺🇸</option>
                    <option value="EUR">EUR 🇪🇺</option>
                    <option value="GBP">GBP 🇬🇧</option>
                  </select>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Default tax rate (%)</label>
                  <input type="number" formControlName="taxRate" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                         style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Category</label>
                  <select formControlName="category" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                          style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);">
                    <option *ngFor="let cat of businessCategories" [value]="cat">{{ cat }}</option>
                  </select>
                </div>
              </form>
            </div>
          </div>

          <!-- Security Tab Content -->
          <div *ngIf="tab === 'security'" class="space-y-6">
            <div class="tf-card !p-6">
              <div class="flex items-center gap-3 mb-6">
                <span class="text-2xl">🛡️</span>
                <div>
                  <h3 class="text-lg font-bold">Security Questions</h3>
                  <p class="text-sm muted">Add multiple questions to secure your account recovery.</p>
                </div>
              </div>

              <!-- Questions List -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div *ngFor="let q of securityQuestions" class="relative group p-4 rounded-xl border transition-all duration-300 hover:bg-[var(--tf-surface-2)]"
                     style="border-color: var(--tf-border); background: var(--tf-surface);">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <span class="text-xs font-bold uppercase tracking-wider text-primary-700 mb-1 block">Question</span>
                      <p class="font-medium pr-8 text-sm">{{ q.question }}</p>
                    </div>
                    <div class="w-6 h-6 rounded bg-primary-50 border flex items-center justify-center text-primary-700 text-xs"
                         style="border-color: var(--tf-border);">✓</div>
                  </div>
                </div>
              </div>

              <!-- Add New Question Form -->
              <div class="border-t pt-6" style="border-color: var(--tf-border);">
                <form [formGroup]="securityForm" (ngSubmit)="submitSecurityQuestion()" class="space-y-4 max-w-xl">
                  <div>
                    <label class="block text-[10px] font-bold uppercase tracking-widest muted mb-2">New Question</label>
                    <input formControlName="question" placeholder="e.g. What was your first pet's name?" 
                           class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                           style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase tracking-widest muted mb-2">Answer</label>
                    <input type="password" formControlName="answer" placeholder="••••••••"
                           class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                           style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
                  </div>
                  <button type="submit" [disabled]="securityForm.invalid || securitySaving"
                          class="px-6 h-11 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 transition-all font-bold text-sm text-white">
                    {{ securitySaving ? 'Adding...' : 'Add Question' }}
                  </button>
                </form>
              </div>
            </div>

            <!-- 2FA Section -->
            <div class="tf-card !p-6">
              <div class="flex items-center gap-3 mb-6">
                <span class="text-2xl">📱</span>
                <div>
                  <h3 class="text-lg font-bold">Two-Factor Authentication (2FA)</h3>
                  <p class="text-sm muted">Add an extra layer of security to your account using Google Authenticator.</p>
                </div>
              </div>

              <div class="p-4 rounded-xl border" style="border-color: var(--tf-border); background: var(--tf-surface);">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center" 
                         [class.bg-primary-50]="user()?.is2faEnabled"
                           [style.background]="user()?.is2faEnabled ? null : 'var(--tf-surface-2)'">
                        <span [class.text-primary-700]="user()?.is2faEnabled"
                              [style.color]="user()?.is2faEnabled ? null : 'var(--tf-muted)'">
                        {{ user()?.is2faEnabled ? '🔒' : '🔓' }}
                      </span>
                    </div>
                    <div>
                      <p class="font-bold">Status: {{ user()?.is2faEnabled ? 'Enabled' : 'Disabled' }}</p>
                      <p class="text-xs muted">{{ user()?.is2faEnabled ? 'Your account is secured with 2FA.' : 'Enable 2FA to protect your account from unauthorized access.' }}</p>
                    </div>
                  </div>
                  
                  <button *ngIf="!user()?.is2faEnabled" 
                          (click)="onEnable2faClick()"
                          [disabled]="isGenerating2fa"
                          class="px-6 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 font-bold text-sm transition-all text-white disabled:opacity-50">
                    {{ isGenerating2fa ? 'Generating...' : 'Enable 2FA' }}
                  </button>
                  
                  <button *ngIf="user()?.is2faEnabled" 
                          class="px-6 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-all border border-red-200 opacity-60 cursor-not-allowed">
                    Disable 2FA
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- 2FA Modal -->
    <div *ngIf="show2faModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] grid place-items-center p-6">
      <div class="w-full max-w-md border rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-200 text-center"
           style="background: var(--tf-card); border-color: var(--tf-border); color: var(--tf-on-surface);">
        <h3 class="text-xl font-bold mb-2">Set up 2FA</h3>
        <p class="text-sm muted mb-6">Scan this QR code with your Google Authenticator app and enter the 6-digit code.</p>
        
        <div class="mb-8 p-4 rounded-xl inline-block mx-auto border" style="background: var(--tf-surface); border-color: var(--tf-border);">
          <img [src]="qrCodeUrl" alt="2FA QR Code" class="w-48 h-48 mx-auto"/>
        </div>

        <div class="space-y-4 text-left">
          <label class="block text-[10px] font-bold uppercase tracking-widest muted mb-2">Enter 6-digit Code</label>
          <input [(ngModel)]="otpCode" 
                 placeholder="000000" 
                 maxlength="6"
                 class="w-full h-14 rounded-xl border px-4 text-2xl text-center tracking-[0.5em] outline-none transition-all font-mono focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                 style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
          
          <div class="flex gap-4 pt-4">
            <button (click)="show2faModal = false" class="flex-1 h-11 rounded-xl border text-sm hover:bg-[var(--tf-surface-2)] transition-all"
                    style="border-color: var(--tf-border);">Cancel</button>
            <button (click)="onVerifyOtp()" 
                    [disabled]="otpCode.length !== 6 || isEnabling2fa"
                    class="flex-1 h-11 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 font-bold text-sm transition-all text-white">
              {{ isEnabling2fa ? 'Verifying...' : 'Verify & Enable' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Business Modal -->
    <div *ngIf="showBusinessModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] grid place-items-center p-6">
      <div class="w-full max-w-lg border rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-200"
           style="background: var(--tf-card); border-color: var(--tf-border); color: var(--tf-on-surface);">
        <h3 class="text-xl font-bold mb-2">Create a New Business</h3>
        <p class="text-sm muted mb-8">Fill in the details to add a business to {{ currentTenant()?.name }}.</p>
        
        <form [formGroup]="newBusinessForm" (ngSubmit)="createBusiness()" class="space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2">
              <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Business name</label>
              <input formControlName="name" placeholder="Nom de votre business" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                     style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [class.border-red-500]="(newBusinessForm.get('name')?.touched || submittedBusiness) && newBusinessForm.get('name')?.invalid"/>
              <div *ngIf="(newBusinessForm.get('name')?.touched || submittedBusiness) && newBusinessForm.get('name')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom du business est obligatoire.</div>
              <div *ngIf="(newBusinessForm.get('name')?.touched || submittedBusiness) && newBusinessForm.get('name')?.errors?.['minlength']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom doit contenir au moins 2 caractères.</div>
            </div>
            <div class="col-span-1">
              <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Currency</label>
              <select formControlName="currency" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                      style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [class.border-red-500]="(newBusinessForm.get('currency')?.touched || submittedBusiness) && newBusinessForm.get('currency')?.invalid">
                <option value="TND">TND 🇹🇳</option>
                <option value="USD">USD 🇺🇸</option>
                <option value="EUR">EUR 🇪🇺</option>
              </select>
              <div *ngIf="(newBusinessForm.get('currency')?.touched || submittedBusiness) && newBusinessForm.get('currency')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">La devise est obligatoire.</div>
            </div>
            <div class="col-span-1">
              <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Tax Rate (%)</label>
              <input type="number" formControlName="taxRate" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                     style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [class.border-red-500]="(newBusinessForm.get('taxRate')?.touched || submittedBusiness) && newBusinessForm.get('taxRate')?.invalid"/>
              <div *ngIf="(newBusinessForm.get('taxRate')?.touched || submittedBusiness) && newBusinessForm.get('taxRate')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le taux de taxe est obligatoire.</div>
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Category</label>
              <select formControlName="category" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                      style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);">
                <option *ngFor="let cat of businessCategories" [value]="cat">{{ cat }}</option>
              </select>
            </div>
          </div>

          <div class="flex gap-4 pt-4">
            <button type="button" (click)="showBusinessModal = false" class="flex-1 h-11 rounded-xl border text-sm hover:bg-[var(--tf-surface-2)] transition-all"
                    style="border-color: var(--tf-border);">Cancel</button>
            <button type="submit" [disabled]="newBusinessForm.invalid || isCreatingBusiness" class="flex-1 h-11 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 font-bold text-sm transition-all text-white">
              {{ isCreatingBusiness ? 'Creating...' : 'Create Business' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Tenant Modal -->
    <div *ngIf="showTenantModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] grid place-items-center p-6">
      <div class="w-full max-w-lg border rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-200"
           style="background: var(--tf-card); border-color: var(--tf-border); color: var(--tf-on-surface);">
        <h3 class="text-xl font-bold mb-2">Request a New Company</h3>
        <p class="text-sm muted mb-8">Send a request to create a new tenant. Our team will review it.</p>
        
        <form [formGroup]="newTenantForm" (ngSubmit)="requestTenant()" class="space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2">
              <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Company name</label>
              <input formControlName="name" placeholder="Nom de votre entreprise" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                     style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [class.border-red-500]="(newTenantForm.get('name')?.touched || submittedTenant) && newTenantForm.get('name')?.invalid"/>
              <div *ngIf="(newTenantForm.get('name')?.touched || submittedTenant) && newTenantForm.get('name')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom de l'entreprise est obligatoire.</div>
              <div *ngIf="(newTenantForm.get('name')?.touched || submittedTenant) && newTenantForm.get('name')?.errors?.['minlength']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom de l'entreprise doit contenir au moins 2 caractères.</div>
            </div>
            <div class="col-span-1">
              <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Tax ID / Matricule</label>
              <input formControlName="matricule" placeholder="13 caractères (ex: 1234567ABC000)" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                     style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [class.border-red-500]="(newTenantForm.get('matricule')?.touched || submittedTenant) && newTenantForm.get('matricule')?.invalid"/>
              <div *ngIf="(newTenantForm.get('matricule')?.touched || submittedTenant) && newTenantForm.get('matricule')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le matricule est obligatoire.</div>
              <div *ngIf="(newTenantForm.get('matricule')?.touched || submittedTenant) && newTenantForm.get('matricule')?.errors?.['pattern']" class="text-red-500 text-[11px] mt-1 ml-1">Le matricule doit contenir exactement 13 lettres ou chiffres.</div>
            </div>
            <div class="col-span-1">
              <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Phone</label>
              <input formControlName="phone" placeholder="ex: 22111333" class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                     style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [class.border-red-500]="(newTenantForm.get('phone')?.touched || submittedTenant) && newTenantForm.get('phone')?.invalid"/>
              <div *ngIf="(newTenantForm.get('phone')?.touched || submittedTenant) && newTenantForm.get('phone')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le numéro de téléphone est obligatoire.</div>
              <div *ngIf="(newTenantForm.get('phone')?.touched || submittedTenant) && newTenantForm.get('phone')?.errors?.['pattern']" class="text-red-500 text-[11px] mt-1 ml-1">Le numéro doit contenir exactement 8 chiffres.</div>
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-semibold muted uppercase mb-2 tracking-widest">Address</label>
              <input formControlName="address" placeholder="123 Rue de la Liberté, Tunis..." class="w-full h-11 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                     style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [class.border-red-500]="(newTenantForm.get('address')?.touched || submittedTenant) && newTenantForm.get('address')?.invalid"/>
              <div *ngIf="(newTenantForm.get('address')?.touched || submittedTenant) && newTenantForm.get('address')?.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">L'adresse est obligatoire.</div>
              <div *ngIf="(newTenantForm.get('address')?.touched || submittedTenant) && newTenantForm.get('address')?.errors?.['minlength']" class="text-red-500 text-[11px] mt-1 ml-1">L'adresse doit faire au moins 2 caractères.</div>
            </div>
          </div>

          <div class="flex gap-4 pt-4">
            <button type="button" (click)="showTenantModal = false" class="flex-1 h-11 rounded-xl border text-sm hover:bg-[var(--tf-surface-2)] transition-all"
                    style="border-color: var(--tf-border);">Cancel</button>
            <button type="submit" [disabled]="newTenantForm.invalid || isRequestingTenant" class="flex-1 h-11 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 font-bold text-sm transition-all text-white">
              {{ isRequestingTenant ? 'Sending...' : 'Send Request' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private settings = inject(SettingsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  public tenantService = inject(TenantService);
  public theme = inject(ThemeService);
  public user = this.auth.user;

  tab: 'company' | 'business' | 'security' = 'company';
  toast: { message: string; type: 'success' | 'error' } | null = null;
  
  // Tenants
  currentTenant = signal<any>(null);
  allTenants: any[] = [];
  showTenantDropdown = signal(false);
  showTenantModal = false;
  submittedTenant = false;
  isRequestingTenant = false;

  // Businesses
  businesses: any[] = [];
  activeBusinessId: string | null = null;
  activeBusinessName = '';
  showBusinessModal = false;
  submittedBusiness = false;
  isCreatingBusiness = false;

  // Security
  securityQuestions: any[] = [];
  securitySaving = false;
  securityForm = this.fb.group({
    question: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(180)]],
    answer: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
  });

  // 2FA
  show2faModal = false;
  qrCodeUrl = '';
  otpCode = '';
  isGenerating2fa = false;
  isEnabling2fa = false;

  // Forms
  companyForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
    country: ['TN'],
    phone: ['', [Validators.pattern(/^$|^[+0-9()\-\s]{8,20}$/)]],
    matricule: ['', [Validators.maxLength(40)]],
    logoUrl: ['', [Validators.pattern(/^(https?:\/\/|data:image\/).+/i)]],
  });

  businessForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    currency: ['TND', Validators.required],
    taxRate: [19, [Validators.required, Validators.min(0), Validators.max(100)]],
    category: ['Autre', Validators.required],
  });

  newBusinessForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    currency: ['TND', Validators.required],
    taxRate: [19, [Validators.required, Validators.min(0), Validators.max(100)]],
    category: ['Autre', Validators.required],
  });

  newTenantForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    address: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    matricule: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9]{13}$/)]],
    country: ['TN', Validators.required],
  });

  businessCategories: string[] = [];
  countries: any[] = [];
  companyLogo: string | null = null;

  isSavingAll = false;

  ngOnInit() {
    // Avoid calling protected endpoints if token is missing.
    // If token is present but invalid/expired, requests below will 401 and we log out.
    if (!this.auth.token()) {
      this.auth.logout();
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loadData();
    this.loadOptions();
  }

  loadOptions() {
    this.settings.categories().subscribe({
      next: (cats) => {
        setTimeout(() => {
          this.businessCategories = cats.map((c: any) => c.label || c);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        if (err?.status === 401) return this.handleUnauthorized();
      },
    });

    this.settings.countries().subscribe({
      next: (countries) => {
        setTimeout(() => {
          this.countries = countries;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        if (err?.status === 401) return this.handleUnauthorized();
      },
    });
  }

  loadData() {
    // Load Tenant Info
    this.settings.tenant().subscribe({
      next: (t: any) => {
        setTimeout(() => {
          this.currentTenant.set(t);
          this.companyLogo = t.logoUrl;
          this.companyForm.patchValue({
            name: t.name,
            address: t.address,
            country: t.country,
            phone: t.phone,
            matricule: t.matricule,
            logoUrl: t.logoUrl
          });
          // Update global tenant service for navbar
          this.tenantService.setTenant(t.id, t.name, t.logoUrl);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        if (err?.status === 401) return this.handleUnauthorized();
      },
    });

    // All Tenants
    this.settings.getAllTenants().subscribe({
      next: (list: any[]) => setTimeout(() => {
        this.allTenants = list;
        this.cdr.detectChanges();
      }),
      error: (err) => {
        if (err?.status === 401) return this.handleUnauthorized();
      },
    });

    // Load Businesses
    this.settings.getBusinesses().subscribe({
      next: (list: any[]) => {
        setTimeout(() => {
          this.businesses = list;
          if (list.length > 0) {
            this.selectBusiness(list[0]);
          } else {
            this.activeBusinessId = null;
            this.activeBusinessName = 'No business';
            this.businessForm.reset();
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        if (err?.status === 401) return this.handleUnauthorized();
      },
    });

    // Security Questions
    this.auth.getSecurityQuestions().subscribe({
      next: (questions: any[]) => {
        setTimeout(() => {
          this.securityQuestions = questions;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        if (err?.status === 401) return this.handleUnauthorized();
      },
    });
  }

  private handleUnauthorized() {
    // Token missing/expired: clear local session and return user to login.
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toast = { message, type };
    setTimeout(() => this.toast = null, 3000);
  }

  toggleTenantDropdown() {
    this.showTenantDropdown.update(v => !v);
  }

  switchTenant(id: string) {
    localStorage.setItem('activeTenantId', id);
    this.tenantService.setActiveTenant(id);
    this.showTenantDropdown.set(false);
    
    // Clear current selection immediately
    this.activeBusinessId = null;
    this.activeBusinessName = '';
    this.businesses = [];
    this.businessForm.reset();
    
    // Clear current logo and name immediately to show loading state
    this.tenantService.setTenant(id, 'Loading...', null);
    
    // Refresh data
    this.loadData();
  }

  selectBusiness(b: any) {
    this.activeBusinessId = b.id;
    this.activeBusinessName = b.name;
    this.businessForm.patchValue({
      name: b.name,
      currency: b.currency,
      taxRate: b.taxRate,
      category: b.category || 'Autre'
    });
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64 = e.target.result;
        this.companyLogo = base64;
        this.companyForm.patchValue({ logoUrl: base64 });
        
        const tenant = this.currentTenant();
        if (tenant) {
          const tenantName = this.companyForm.get('name')?.value || tenant.name;
          this.tenantService.setTenant(tenant.id, tenantName, base64);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  saveAll() {
    if (this.companyForm.invalid || (this.activeBusinessId && this.businessForm.invalid)) {
      this.companyForm.markAllAsTouched();
      this.businessForm.markAllAsTouched();
      return;
    }
    this.isSavingAll = true;
    
    // 1. Save Tenant - Only: name, phone, address, matricule, logoUrl
    const tenantFormValue = this.companyForm.value;
    const tenantPayload = {
      name: tenantFormValue.name!,
      phone: tenantFormValue.phone!,
      address: tenantFormValue.address!,
      matricule: tenantFormValue.matricule!,
      logoUrl: tenantFormValue.logoUrl!
    };

    const t$ = this.settings.updateTenant(tenantPayload);

    t$.subscribe({
      next: () => {
        // 2. Save Business only if active
        if (this.activeBusinessId) {
          const businessFormValue = this.businessForm.value;
          const businessPayload = {
            name: businessFormValue.name!,
            currency: businessFormValue.currency!,
            taxRate: businessFormValue.taxRate!,
            category: businessFormValue.category!
          };

          this.settings.updateBusiness(this.activeBusinessId, businessPayload).subscribe({
            next: () => {
              this.isSavingAll = false;
              this.showToast('Modifications enregistrées', 'success');
              this.loadData();
            },
            error: (err) => {
              this.isSavingAll = false;
              this.showToast(err?.error?.message || 'Erreur lors de la mise à jour du business', 'error');
            }
          });
        } else {
          this.isSavingAll = false;
          this.showToast('Entreprise mise à jour', 'success');
          this.loadData();
        }
      },
      error: (err) => {
        this.isSavingAll = false;
        this.showToast(err?.error?.message || 'Erreur lors de la mise à jour de l\'entreprise', 'error');
      }
    });
  }

  createBusiness() {
    this.submittedBusiness = true;
    console.log('--- Formulaire Business (Settings) ---');
    console.log('Valide:', this.newBusinessForm.valid);
    console.log('Valeurs:', this.newBusinessForm.value);

    if (this.newBusinessForm.invalid) {
      console.log('Erreurs:', this.getFormErrors(this.newBusinessForm));
      this.newBusinessForm.markAllAsTouched();
      return;
    }
    this.isCreatingBusiness = true;
    this.settings.createBusiness(this.newBusinessForm.value).subscribe({
      next: (res) => {
        this.isCreatingBusiness = false;
        this.showBusinessModal = false;
        this.businesses.push(res.business);
        this.newBusinessForm.reset({ currency: 'TND', taxRate: 19, category: 'Autre' });
        this.showToast('Business créé avec succès', 'success');
      },
      error: () => {
        this.isCreatingBusiness = false;
        this.showToast('Erreur lors de la création', 'error');
      }
    });
  }

  requestTenant() {
    this.submittedTenant = true;
    console.log('--- Formulaire Tenant (Settings) ---');
    console.log('Valide:', this.newTenantForm.valid);
    console.log('Valeurs:', this.newTenantForm.value);

    if (this.newTenantForm.invalid) {
      console.log('Erreurs:', this.getFormErrors(this.newTenantForm));
      this.newTenantForm.markAllAsTouched();
      return;
    }
    this.isRequestingTenant = true;
    this.settings.requestTenant(this.newTenantForm.value).subscribe({
      next: (res) => {
        this.isRequestingTenant = false;
        this.showTenantModal = false;
        this.newTenantForm.reset({ country: 'TN' });
        this.showToast(res.message, 'success');
      },
      error: (err) => {
        this.isRequestingTenant = false;
        this.showToast(err?.error?.message || 'Erreur lors de la demande', 'error');
      }
    });
  }

  submitSecurityQuestion() {
    if (this.securityForm.invalid) {
      this.securityForm.markAllAsTouched();
      return;
    }
    this.securitySaving = true;
    const { question, answer } = this.securityForm.value;
    this.auth.setSecurityQuestions({ question: question!, answer: answer! }).subscribe(res => {
      this.securitySaving = false;
      this.securityQuestions.push(res.question);
      this.securityForm.reset();
      this.showToast('Question de sécurité ajoutée', 'success');
    });
  }

  onEnable2faClick() {
    if (this.isGenerating2fa) return;
    this.isGenerating2fa = true;
    console.log('[Settings] Requesting 2FA generation...');
    
    this.auth.generate2fa().pipe(
       finalize(() => {
         this.isGenerating2fa = false;
         this.cdr.detectChanges();
         console.log('[Settings] 2FA generation request completed (finalize)');
       })
     ).subscribe({
       next: (res) => {
         console.log('[Settings] 2FA generation success:', res);
         this.qrCodeUrl = res.qrCodeDataUrl;
         this.show2faModal = true;
         this.otpCode = '';
         this.cdr.detectChanges();
       },
       error: (err) => {
         console.error('[Settings] 2FA generation error:', err);
         this.showToast(err?.error?.message || 'Error generating 2FA QR code', 'error');
         this.cdr.detectChanges();
       }
     });
   }

  onVerifyOtp() {
    if (this.otpCode.length !== 6) return;
    this.isEnabling2fa = true;
    this.auth.enable2fa(this.otpCode).subscribe({
      next: () => {
        this.isEnabling2fa = false;
        this.show2faModal = false;
        this.showToast('Two-factor authentication enabled successfully', 'success');
        
        // Update user state locally
        const currentUser = this.auth.user();
        if (currentUser) {
          const updated = { ...currentUser, is2faEnabled: true };
          localStorage.setItem('taskflow-user', JSON.stringify(updated));
          // We need a way to refresh the signal, for now manual update if possible or reload
          window.location.reload(); 
        }
      },
      error: (err) => {
        this.isEnabling2fa = false;
        this.showToast(err?.error?.message || 'Invalid OTP code', 'error');
      }
    });
  }

  ngOnDestroy() {}

  private getFormErrors(form: FormGroup) {
    const errors: any = {};
    Object.keys(form.controls).forEach(key => {
      const controlErrors = form.get(key)?.errors;
      if (controlErrors) {
        errors[key] = controlErrors;
      }
    });
    return errors;
  }
}
