import { Component, OnInit, inject, signal, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { TenantService } from '../../core/services/tenant.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'tf-settings',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, NgIf, NgFor],
  template: `
    <div class="flex min-h-[600px] bg-[#0a1a0a] text-white">
      <!-- Sidebar -->
      <div class="w-[220px] border-r border-emerald-900/30 flex flex-col p-4 bg-[#0d1f17]">
        <h1 class="text-xl font-bold mb-6 px-2">Settings</h1>
        
        <!-- Tenant Switcher -->
        <div class="relative mb-4">
          <button (click)="toggleTenantDropdown()" 
                  class="w-full p-3 rounded-xl bg-[#123424] border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex items-center justify-between group">
            <div class="flex items-center gap-2 overflow-hidden">
              <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                {{ currentTenant()?.name?.substring(0, 2)?.toUpperCase() }}
              </div>
              <span class="truncate font-medium text-sm">{{ currentTenant()?.name }}</span>
            </div>
            <span class="text-xs transition-transform duration-200" [class.rotate-180]="showTenantDropdown()">▼</span>
          </button>
          
          <!-- Dropdown -->
          <div *ngIf="showTenantDropdown()" 
               class="absolute top-full left-0 right-0 mt-2 py-2 bg-[#123424] border border-emerald-500/20 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
            <button *ngFor="let t of allTenants" 
                    (click)="switchTenant(t.id)"
                    class="w-full px-4 py-2 hover:bg-emerald-900/40 flex items-center gap-3 transition-colors text-left text-white">
              <div class="w-6 h-6 rounded bg-emerald-700/50 flex items-center justify-center text-[10px] font-bold">
                {{ t.name.substring(0, 2).toUpperCase() }}
              </div>
              <span class="text-sm truncate flex-1" [class.text-emerald-400]="t.id === currentTenant()?.id">{{ t.name }}</span>
            </button>
          </div>
        </div>

        <!-- Add Company Button -->
        <button (click)="showTenantModal = true" 
                class="w-full mb-8 p-2 rounded-lg border border-dashed border-emerald-900/50 text-[10px] uppercase font-bold tracking-wider text-emerald-500/60 hover:bg-emerald-500/5 transition-all">
          + New Company
        </button>

        <!-- Navigation Section: Configuration -->
        <div class="space-y-1 mb-8">
          <p class="px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 mb-2">Configuration</p>
          <button (click)="tab = 'company'" 
                  class="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all text-left"
                  [class.text-emerald-400]="tab === 'company'"
                  [class.bg-emerald-500/10]="tab === 'company'"
                  [class.border-l-2]="tab === 'company'"
                  [class.border-emerald-500]="tab === 'company'"
                  [class.text-gray-400]="tab !== 'company'">
            <span>🏢</span> Company profile
          </button>
          <button (click)="tab = 'security'" 
                  class="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all text-left"
                  [class.text-emerald-400]="tab === 'security'"
                  [class.bg-emerald-500/10]="tab === 'security'"
                  [class.border-l-2]="tab === 'security'"
                  [class.border-emerald-500]="tab === 'security'"
                  [class.text-gray-400]="tab !== 'security'">
            <span>🛡️</span> Security
          </button>
          <button class="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 text-gray-400 opacity-50 cursor-not-allowed text-left">
            <span>👥</span> Team and roles
          </button>
        </div>

        <!-- Navigation Section: Businesses -->
        <div class="space-y-1">
          <p class="px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 mb-2">Businesses</p>
          <button *ngFor="let b of businesses" 
                  (click)="selectBusiness(b)"
                  class="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all text-left"
                  [class.text-emerald-400]="activeBusinessId === b.id"
                  [class.bg-emerald-500/5]="activeBusinessId === b.id"
                  [class.text-gray-400]="activeBusinessId !== b.id">
            <span class="w-2 h-2 rounded-full" [class.bg-emerald-500]="activeBusinessId === b.id" [class.bg-gray-600]="activeBusinessId !== b.id"></span>
            <span class="truncate">{{ b.name }}</span>
          </button>
          
          <button (click)="showBusinessModal = true"
                  class="w-full mt-4 p-2 rounded-lg border border-dashed border-emerald-900/50 text-xs text-emerald-500/60 hover:bg-emerald-500/5 transition-all">
            + Add business
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 p-8 bg-[#0a1a0a] overflow-y-auto">
        <!-- Toast Notification -->
        <div *ngIf="toast" 
             class="fixed top-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-[100] animate-in slide-in-from-right duration-300"
             [class.bg-emerald-600]="toast.type === 'success'"
             [class.bg-red-600]="toast.type === 'error'">
          {{ toast.message }}
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between mb-8 pb-6 border-b border-emerald-900/20">
          <div>
            <h2 class="text-2xl font-bold">{{ tab === 'company' ? 'Company profile' : tab === 'security' ? 'Security' : 'Business Settings' }}</h2>
            <p class="text-sm text-gray-400">{{ currentTenant()?.name }} • {{ currentTenant()?.country }}</p>
          </div>
          <div class="flex gap-3">
            <button (click)="loadData()" class="px-4 py-2 rounded-xl border border-emerald-800 text-sm hover:bg-emerald-900/20 transition-all">Cancel</button>
            <button (click)="saveAll()" 
                    [disabled]="isSavingAll"
                    class="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-sm transition-all shadow-lg shadow-emerald-900/20">
              {{ isSavingAll ? 'Saving...' : 'Save changes' }}
            </button>
          </div>
        </div>

        <div class="max-w-4xl space-y-8">
          <!-- Company Profile Tab Content -->
          <div *ngIf="tab === 'company'" class="space-y-8">
            <!-- CARD 1: Company Identity -->
            <div class="rounded-2xl border border-emerald-900/30 bg-[#0d1f17] p-6 shadow-xl">
              <div class="flex items-center justify-between mb-6">
                <h3 class="font-bold flex items-center gap-2 text-white">
                  Company identity
                  <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] text-emerald-500 border border-emerald-500/20">Tenant</span>
                </h3>
              </div>

              <div class="flex items-center gap-6 mb-8 p-4 rounded-xl bg-[#123424]/50 border border-emerald-500/10">
                <div class="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-2xl font-bold border-4 border-[#0d1f17] text-white overflow-hidden">
                  <img *ngIf="tenantService.logo()" [src]="tenantService.logo()" class="w-full h-full object-cover"/>
                  <span *ngIf="!tenantService.logo()">{{ companyForm.get('name')?.value?.substring(0, 2)?.toUpperCase() }}</span>
                </div>
                <div class="flex-1">
                  <h4 class="font-bold text-white">{{ companyForm.get('name')?.value }}</h4>
                  <p class="text-xs text-gray-400">Upload a logo to appear on invoices</p>
                </div>
                <input type="file" #fileInput (change)="onLogoSelected($event)" accept="image/*" class="hidden">
                <button type="button" (click)="fileInput.click()" class="px-4 py-2 rounded-lg bg-emerald-900/40 text-xs font-bold hover:bg-emerald-900/60 transition-all text-white">Upload logo</button>
              </div>

              <form [formGroup]="companyForm" class="grid grid-cols-2 gap-6">
                <div class="col-span-1">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Company name</label>
                  <input formControlName="name" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Tax ID / Matricule</label>
                  <input formControlName="matricule" placeholder="e.g. 1234567/A/M/000" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
                </div>
                <div class="col-span-1 opacity-60">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Country (auto)</label>
                  <input [value]="currentTenant()?.country" readonly class="w-full h-11 rounded-xl bg-[#0a1a0a] border border-emerald-500/5 px-4 text-sm text-white cursor-not-allowed outline-none"/>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Phone</label>
                  <input formControlName="phone" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Address</label>
                  <input formControlName="address" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
                </div>
              </form>
            </div>

            <!-- CARD 2: Active Business -->
            <div class="rounded-2xl border border-emerald-900/30 bg-[#0d1f17] p-6 shadow-xl">
              <div class="flex items-center justify-between mb-6">
                <h3 class="font-bold flex items-center gap-2 text-white">
                  Active business settings
                  <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] text-emerald-500 border border-emerald-500/20">
                    {{ activeBusinessName }}
                  </span>
                </h3>
              </div>

              <form [formGroup]="businessForm" class="grid grid-cols-2 gap-6">
                <div class="col-span-1">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Business name</label>
                  <input formControlName="name" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Currency</label>
                  <select formControlName="currency" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all">
                    <option value="TND">TND 🇹🇳</option>
                    <option value="USD">USD 🇺🇸</option>
                    <option value="EUR">EUR 🇪🇺</option>
                    <option value="GBP">GBP 🇬🇧</option>
                  </select>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Default tax rate (%)</label>
                  <input type="number" formControlName="taxRate" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
                </div>
                <div class="col-span-1">
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Category</label>
                  <select formControlName="category" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all">
                    <option *ngFor="let cat of businessCategories" [value]="cat">{{ cat }}</option>
                  </select>
                </div>
              </form>
            </div>
          </div>

          <!-- Security Tab Content -->
          <div *ngIf="tab === 'security'" class="space-y-6">
            <div class="rounded-2xl border border-emerald-900/30 bg-[#0d1f17] p-6 shadow-xl">
              <div class="flex items-center gap-3 mb-6">
                <span class="text-2xl">🛡️</span>
                <div>
                  <h3 class="text-lg font-bold text-white">Security Questions</h3>
                  <p class="text-sm text-gray-400">Add multiple questions to secure your account recovery.</p>
                </div>
              </div>

              <!-- Questions List -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div *ngFor="let q of securityQuestions" class="relative group p-4 rounded-xl bg-[#123424] border border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <span class="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1 block">Question</span>
                      <p class="text-white font-medium pr-8 text-sm">{{ q.question }}</p>
                    </div>
                    <div class="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs">✓</div>
                  </div>
                </div>
              </div>

              <!-- Add New Question Form -->
              <div class="border-t border-emerald-900/20 pt-6">
                <form [formGroup]="securityForm" (ngSubmit)="submitSecurityQuestion()" class="space-y-4 max-w-xl">
                  <div>
                    <label class="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">New Question</label>
                    <input formControlName="question" placeholder="e.g. What was your first pet's name?" 
                           class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white outline-none focus:border-emerald-500 transition-all"/>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Answer</label>
                    <input type="password" formControlName="answer" placeholder="••••••••"
                           class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white outline-none focus:border-emerald-500 transition-all"/>
                  </div>
                  <button type="submit" [disabled]="securityForm.invalid || securitySaving"
                          class="px-6 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all font-bold text-sm text-white">
                    {{ securitySaving ? 'Adding...' : 'Add Question' }}
                  </button>
                </form>
              </div>
            </div>

            <!-- 2FA Section -->
            <div class="rounded-2xl border border-emerald-900/30 bg-[#0d1f17] p-6 shadow-xl">
              <div class="flex items-center gap-3 mb-6">
                <span class="text-2xl">📱</span>
                <div>
                  <h3 class="text-lg font-bold text-white">Two-Factor Authentication (2FA)</h3>
                  <p class="text-sm text-gray-400">Add an extra layer of security to your account using Google Authenticator.</p>
                </div>
              </div>

              <div class="p-4 rounded-xl bg-[#123424] border border-emerald-500/20">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center" 
                         [class.bg-emerald-500/10]="user()?.is2faEnabled"
                         [class.bg-gray-500/10]="!user()?.is2faEnabled">
                      <span [class.text-emerald-500]="user()?.is2faEnabled"
                            [class.text-gray-500]="!user()?.is2faEnabled">
                        {{ user()?.is2faEnabled ? '🔒' : '🔓' }}
                      </span>
                    </div>
                    <div>
                      <p class="font-bold text-white">Status: {{ user()?.is2faEnabled ? 'Enabled' : 'Disabled' }}</p>
                      <p class="text-xs text-gray-400">{{ user()?.is2faEnabled ? 'Your account is secured with 2FA.' : 'Enable 2FA to protect your account from unauthorized access.' }}</p>
                    </div>
                  </div>
                  
                  <button *ngIf="!user()?.is2faEnabled" 
                          (click)="onEnable2faClick()"
                          [disabled]="isGenerating2fa"
                          class="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50">
                    {{ isGenerating2fa ? 'Generating...' : 'Enable 2FA' }}
                  </button>
                  
                  <button *ngIf="user()?.is2faEnabled" 
                          class="px-6 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-500 font-bold text-sm transition-all border border-red-500/20 opacity-50 cursor-not-allowed">
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
      <div class="w-full max-w-md bg-[#0d1f17] border border-emerald-900/30 rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-200 text-center">
        <h3 class="text-xl font-bold mb-2">Set up 2FA</h3>
        <p class="text-sm text-gray-400 mb-6">Scan this QR code with your Google Authenticator app and enter the 6-digit code.</p>
        
        <div class="mb-8 p-4 bg-white rounded-xl inline-block mx-auto">
          <img [src]="qrCodeUrl" alt="2FA QR Code" class="w-48 h-48 mx-auto"/>
        </div>

        <div class="space-y-4 text-left">
          <label class="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Enter 6-digit Code</label>
          <input [(ngModel)]="otpCode" 
                 placeholder="000000" 
                 maxlength="6"
                 class="w-full h-14 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-2xl text-center tracking-[0.5em] text-white outline-none focus:border-emerald-500 transition-all font-mono"/>
          
          <div class="flex gap-4 pt-4">
            <button (click)="show2faModal = false" class="flex-1 h-11 rounded-xl border border-emerald-800 text-sm hover:bg-emerald-900/20 transition-all">Cancel</button>
            <button (click)="onVerifyOtp()" 
                    [disabled]="otpCode.length !== 6 || isEnabling2fa"
                    class="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-sm transition-all shadow-lg shadow-emerald-900/20">
              {{ isEnabling2fa ? 'Verifying...' : 'Verify & Enable' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Business Modal -->
    <div *ngIf="showBusinessModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] grid place-items-center p-6">
      <div class="w-full max-w-lg bg-[#0d1f17] border border-emerald-900/30 rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-200">
        <h3 class="text-xl font-bold mb-2">Create a New Business</h3>
        <p class="text-sm text-gray-400 mb-8">Fill in the details to add a business to {{ currentTenant()?.name }}.</p>
        
        <form [formGroup]="newBusinessForm" (ngSubmit)="createBusiness()" class="space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Business name</label>
              <input formControlName="name" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
            </div>
            <div class="col-span-1">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Currency</label>
              <select formControlName="currency" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all">
                <option value="TND">TND 🇹🇳</option>
                <option value="USD">USD 🇺🇸</option>
                <option value="EUR">EUR 🇪🇺</option>
              </select>
            </div>
            <div class="col-span-1">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Tax Rate (%)</label>
              <input type="number" formControlName="taxRate" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Category</label>
              <select formControlName="category" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all">
                <option *ngFor="let cat of businessCategories" [value]="cat">{{ cat }}</option>
              </select>
            </div>
          </div>

          <div class="flex gap-4 pt-4">
            <button type="button" (click)="showBusinessModal = false" class="flex-1 h-11 rounded-xl border border-emerald-800 text-sm hover:bg-emerald-900/20 transition-all">Cancel</button>
            <button type="submit" [disabled]="newBusinessForm.invalid || isCreatingBusiness" class="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-sm transition-all shadow-lg shadow-emerald-900/20">
              {{ isCreatingBusiness ? 'Creating...' : 'Create Business' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Tenant Modal -->
    <div *ngIf="showTenantModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] grid place-items-center p-6">
      <div class="w-full max-w-lg bg-[#0d1f17] border border-emerald-900/30 rounded-2xl p-8 shadow-2xl animate-in zoom-in duration-200">
        <h3 class="text-xl font-bold mb-2">Request a New Company</h3>
        <p class="text-sm text-gray-400 mb-8">Send a request to create a new tenant. Our team will review it.</p>
        
        <form [formGroup]="newTenantForm" (ngSubmit)="requestTenant()" class="space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Company name</label>
              <input formControlName="name" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
            </div>
            <div class="col-span-1">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Tax ID / Matricule</label>
              <input formControlName="matricule" placeholder="e.g. 1234567/A/M/000" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
            </div>
            <div class="col-span-1">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Phone</label>
              <input formControlName="phone" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Address</label>
              <input formControlName="address" class="w-full h-11 rounded-xl bg-[#123424] border border-emerald-500/10 px-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"/>
            </div>
          </div>

          <div class="flex gap-4 pt-4">
            <button type="button" (click)="showTenantModal = false" class="flex-1 h-11 rounded-xl border border-emerald-800 text-sm hover:bg-emerald-900/20 transition-all">Cancel</button>
            <button type="submit" [disabled]="newTenantForm.invalid || isRequestingTenant" class="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-sm transition-all shadow-lg shadow-emerald-900/20">
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
  private cdr = inject(ChangeDetectorRef);
  public tenantService = inject(TenantService);
  public user = this.auth.user;

  tab: 'company' | 'business' | 'security' = 'company';
  toast: { message: string; type: 'success' | 'error' } | null = null;
  
  // Tenants
  currentTenant = signal<any>(null);
  allTenants: any[] = [];
  showTenantDropdown = signal(false);
  showTenantModal = false;
  isRequestingTenant = false;

  // Businesses
  businesses: any[] = [];
  activeBusinessId: string | null = null;
  activeBusinessName = '';
  showBusinessModal = false;
  isCreatingBusiness = false;

  // Security
  securityQuestions: any[] = [];
  securitySaving = false;
  securityForm = this.fb.group({
    question: ['', [Validators.required, Validators.minLength(5)]],
    answer: ['', [Validators.required, Validators.minLength(2)]],
  });

  // 2FA
  show2faModal = false;
  qrCodeUrl = '';
  otpCode = '';
  isGenerating2fa = false;
  isEnabling2fa = false;

  // Forms
  companyForm = this.fb.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    country: ['TN'],
    phone: [''],
    matricule: [''],
    logoUrl: [''],
  });

  businessForm = this.fb.group({
    name: ['', Validators.required],
    currency: ['TND', Validators.required],
    taxRate: [19, Validators.required],
    category: ['Autre', Validators.required],
  });

  newBusinessForm = this.fb.group({
    name: ['', Validators.required],
    currency: ['TND', Validators.required],
    taxRate: [19, Validators.required],
    category: ['Autre', Validators.required],
  });

  newTenantForm = this.fb.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    phone: [''],
    matricule: [''],
    country: ['TN'],
  });

  businessCategories: string[] = [];
  countries: any[] = [];
  companyLogo: string | null = null;

  isSavingAll = false;

  ngOnInit() {
    this.loadData();
    this.loadOptions();
  }

  loadOptions() {
    this.settings.categories().subscribe(cats => {
      this.businessCategories = cats.map((c: any) => c.label || c);
    });
    this.settings.countries().subscribe(countries => {
      this.countries = countries;
    });
  }

  loadData() {
    // Load Tenant Info
    this.settings.tenant().subscribe({
      next: (t: any) => {
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
      }
    });

    // All Tenants
    this.settings.getAllTenants().subscribe((list: any[]) => this.allTenants = list);

    // Load Businesses
    this.settings.getBusinesses().subscribe({
      next: (list: any[]) => {
        this.businesses = list;
        if (list.length > 0) {
          this.selectBusiness(list[0]);
        } else {
          this.activeBusinessId = null;
          this.activeBusinessName = 'No business';
          this.businessForm.reset();
        }
      }
    });

    // Security Questions
    this.auth.getSecurityQuestions().subscribe((questions: any[]) => {
      this.securityQuestions = questions;
    });
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
    if (this.newBusinessForm.invalid) return;
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
    if (this.newTenantForm.invalid) return;
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
    if (this.securityForm.invalid) return;
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
}
