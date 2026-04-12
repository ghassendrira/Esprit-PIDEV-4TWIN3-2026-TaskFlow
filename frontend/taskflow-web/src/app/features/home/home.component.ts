import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'tf-home',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf],
  styles: [],
  template: `
    <div class="min-h-screen" style="background: var(--tf-surface); color: var(--tf-on-surface);">
    <!-- Top announcement -->
    <div class="w-full bg-primary-600 text-white text-center text-xs md:text-sm py-2">
      <span class="font-medium">🎉 Essai gratuit 30 jours — Aucune carte bancaire requise</span>
      <a href="#pricing" class="ml-2 underline underline-offset-2 decoration-white/60 hover:text-white">Commencer maintenant</a>
    </div>
    <!-- Navbar -->
    <header class="sticky top-0 z-40 backdrop-blur border-b" style="background: var(--tf-card); border-color: var(--tf-border);">
      <div class="max-w-7xl mx-auto h-20 md:h-24 flex items-center px-6 gap-6">
        <a routerLink="/home" class="flex items-center gap-3">
          <img src="/TASKFLOW-removebg-preview.png" alt="TaskFlow" class="h-20 md:h-24 w-auto max-w-[320px] object-contain" />
        </a>
        <nav class="hidden md:flex items-center gap-10 text-base muted">
          <a href="#for-business" class="hover:text-[color:var(--tf-on-surface)] py-2">Pour les Entreprises</a>
          <a href="#accountants" class="hover:text-[color:var(--tf-on-surface)] py-2">Comptables</a>
          <a href="#pricing" class="hover:text-[color:var(--tf-on-surface)] py-2">Tarifs</a>
          <a href="#support" class="hover:text-[color:var(--tf-on-surface)] py-2">Support</a>
        </nav>
        <div class="flex-1"></div>
        <div class="hidden md:inline text-sm muted">TN | FR</div>
        <button class="hidden md:inline-flex items-center rounded-lg px-4 py-2.5 text-sm border transition hover:bg-[var(--tf-surface-2)]"
                style="border-color: var(--tf-border);"
                (click)="goToLogin()">Connexion</button>
        <a class="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
           routerLink="/auth/register">Essai Gratuit</a>
      </div>
    </header>

    <section class="bg-gradient-to-b from-black via-slate-950 to-primary-900 text-white">
      <div class="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div class="space-y-5">
          <h1 class="text-4xl md:text-6xl font-extrabold leading-tight">
            <span class="text-white block">La gestion intelligente.</span>
            <span class="text-primary-300 block">Locale. Sécurisée.</span>
            <span class="text-white block">Tunisienne.</span>
          </h1>
          <p class="text-slate-200 max-w-xl">Gérez vos factures, dépenses et équipes dans une seule plateforme — avec souveraineté totale des données en Tunisie.</p>
          <div>
            <a href="#pricing" class="inline-flex items-center rounded px-5 py-3 text-sm font-medium bg-primary-600 text-white hover:bg-primary-500">
              Voir les tarifs
            </a>
          </div>
        </div>
        <div class="relative">
          <div class="absolute -inset-6 bg-primary/20 blur-2xl rounded-3xl"></div>
          <div class="relative rounded-3xl shadow-2xl border p-4 md:p-6 rotate-1 scale-[0.7] origin-top-right"
            style="background: var(--tf-card); color: var(--tf-on-surface); border-color: var(--tf-border); transition: all .5s ease"
            [class.opacity-0]="!cardReady()" [class.translate-x-4]="!cardReady()" [class.opacity-100]="cardReady()" [class.translate-x-0]="cardReady()">
            <div class="flex flex-wrap gap-2 mb-5">
              <button *ngFor="let t of tabDefs; index as i"
                      class="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition"
                      style="border-color: var(--tf-border);"
                      [class.text-primary-700]="activeTab()===i"
                      [class.font-semibold]="activeTab()===i"
                      [class.bg-primary-50]="activeTab()===i"
                      [class.border-primary-300]="activeTab()===i"
                      (mouseenter)="hoverTab(i)" (mouseleave)="hoverTab(-1)" (click)="setTab(i)">
                <span class="inline-block w-2 h-2 rounded-full" [style.background]="activeTab()===i ? 'var(--tf-primary)' : 'var(--tf-border)'"></span>{{ t.label }}
                <span *ngIf="activeTab()===i" class="absolute -bottom-2 left-2 right-2 h-[2px] bg-primary-500 rounded"></span>
              </button>
            </div>
            <div class="text-xs font-semibold muted mb-2">BUSINESS FEED</div>
            <div class="grid sm:grid-cols-3 gap-3" (mouseleave)="hoverCard(-1)">
              <div *ngFor="let a of agents(); index as i"
                   class="relative group rounded-xl border p-4 transition-all duration-300"
                   [style.borderColor]="hoveredCard()!==i ? 'var(--tf-border)' : null"
                   [class.border-primary-400]="hoveredCard()===i"
                   [class.shadow-xl]="hoveredCard()===i"
                   [class.hover\\:scale-105]="true"
                   [class.scale-[1.08]]="hoveredCard()===i"
                   [class.opacity-70]="hoveredCard()!==-1 && hoveredCard()!==i"
                   (mouseenter)="hoverCard(i)">
                <div class="flex items-center gap-2 muted mb-2">
                  <span class="inline-block w-2 h-2 rounded-full bg-primary-600"></span>{{ a.title }}
                </div>
                <div class="text-4xl md:text-5xl font-extrabold transition-transform"
                     [class.group-hover\\:scale-110]="true">{{ a.money ? formatMoney(a.value) : a.value }}</div>
                <div class="text-sm muted mt-1">{{ a.suffix }}</div>
                <div *ngIf="hoveredCard()===i" class="mt-2 text-xs text-primary-700">Plus d’infos disponibles</div>
              </div>
            </div>
            <div class="text-xs font-semibold muted mt-6 mb-2">INSIGHTS</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              <div class="rounded-xl border p-4" style="border-color: var(--tf-border); background: var(--tf-card);"><div class="text-xs muted mb-1">Chiffre d'affaires</div><div class="text-2xl font-extrabold">{{ formatMoney(revenue()) }}</div></div>
              <div class="rounded-xl border p-4" style="border-color: var(--tf-border); background: var(--tf-card);"><div class="text-xs muted mb-1">Dépenses</div><div class="text-2xl font-extrabold">{{ formatMoney(financeAgent()) }}</div></div>
              <div class="rounded-xl border p-4" style="border-color: var(--tf-border); background: var(--tf-card);"><div class="text-xs muted mb-1">Bénéfice</div><div class="text-2xl font-extrabold">{{ formatMoney(revenue()-financeAgent()) }}</div></div>
              <div class="rounded-xl border p-4" style="border-color: var(--tf-border); background: var(--tf-card);"><div class="text-xs muted mb-1">Projets actifs</div><div class="text-2xl font-extrabold">{{ projects() }}</div></div>
              <div class="hidden lg:block rounded-xl border p-4" style="border-color: var(--tf-border); background: var(--tf-card);"><div class="text-xs muted mb-1">Leads</div><div class="text-2xl font-extrabold">{{ leads() }}</div></div>
            </div>
            <div class="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <div class="text-xs font-semibold muted mb-2">BANK ACCOUNTS</div>
                <div class="rounded-2xl border p-4" style="border-color: var(--tf-border); background: var(--tf-card);">
                  <div *ngFor="let b of balances" class="flex items-end justify-between py-2">
                    <div>
                      <div class="text-xl font-extrabold">{{ formatMoney(b.amount) }}</div>
                      <div class="text-sm muted">{{ b.label }}</div>
                    </div>
                    <div class="w-2 h-2 rounded-full bg-primary-600 ring-2 ring-primary-300 animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold muted mb-2">CASH FLOW & EXPENSES</div>
                <div class="rounded-2xl border p-4 grid sm:grid-cols-2 gap-4" style="border-color: var(--tf-border); background: var(--tf-card);">
                  <div>
                    <div class="text-center muted mb-2"><span class="text-2xl font-extrabold" style="color: var(--tf-on-surface);">{{ formatMoney(currentBalance()) }}</span> <span class="text-sm">Current cash balance</span></div>
                    <div class="relative h-32" (mousemove)="showBarsTip($event)" (mouseleave)="hideTip()">
                      <div class="absolute inset-x-0 bottom-0 flex items-end gap-2">
                        <div *ngFor="let h of bars(); index as i" class="flex-1 bg-[var(--tf-surface-2)] rounded relative overflow-hidden">
                          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-700 ease-out" [style.height.%]="h"></div>
                        </div>
                      </div>
                      <div *ngIf="tooltip.visible && tooltip.kind === 'bars'" class="absolute pointer-events-none px-2 py-1 text-xs rounded bg-slate-900 text-white shadow-card"
                           [style.left.px]="tooltip.x" [style.top.px]="tooltip.y">{{ tooltip.text }}</div>
                    </div>
                  </div>
                  <div class="grid grid-rows-2 gap-3">
                    <div class="flex items-center gap-3">
                      <div class="relative w-20 h-20 rounded-full"
                           [style.background]="donutBg()">
                        <div class="absolute inset-2 rounded-full bg-[var(--tf-card)]"></div>
                      </div>
                      <div class="text-xs muted">
                        <div><span class="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1"></span>Infrastructure</div>
                        <div><span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>Marketing</div>
                        <div><span class="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1"></span>RH</div>
                        <div><span class="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1"></span>Autre</div>
                      </div>
                    </div>
                    <svg viewBox="0 0 200 60" class="w-full h-16 text-primary-400">
                      <path d="M0 40 L20 36 L40 32 L60 28 L80 22 L100 18 L120 24 L140 20 L160 14 L180 18 L200 12"
                            fill="none" stroke="currentColor" stroke-width="2"
                            [attr.stroke-dasharray]="dashTotal" [attr.stroke-dashoffset]="lineOffset()"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div class="absolute -bottom-4 -left-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600 text-white text-xs shadow-xl ring-2 ring-primary-300 animate-pulse">
              <span>🇹🇳 Données hébergées en Tunisie</span>
              <span class="hidden sm:inline">• Conformité INPDP garantie</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- (sections supplémentaires masquées pour un focus dashboard) -->

    <!-- Features -->
    <section id="features" class="max-w-7xl mx-auto px-4 py-16">
      <h2 class="text-2xl md:text-3xl font-bold mb-6">Fonctionnalités clés</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div *ngFor="let f of features" class="p-4 border rounded-xl hover:-translate-y-0.5 transition" style="border-color: var(--tf-border); background: var(--tf-card);">
          <div class="w-10 h-10 rounded bg-primary/10 grid place-items-center text-primary mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" [attr.d]="f.icon"/></svg>
          </div>
          <div class="font-semibold">{{ f.title }}</div>
          <div class="text-sm muted mt-1">{{ f.desc }}</div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="max-w-7xl mx-auto px-4 py-12">
      <h2 class="text-2xl md:text-3xl font-bold mb-6">Comment ça marche</h2>
      <div class="grid md:grid-cols-3 gap-4">
        <div *ngFor="let s of steps; index as i" class="p-4 border rounded-xl" style="border-color: var(--tf-border); background: var(--tf-card);">
          <div class="text-xs text-primary font-semibold mb-1">Étape {{ i + 1 }}</div>
          <div class="font-semibold">{{ s.title }}</div>
          <div class="text-sm muted mt-1">{{ s.desc }}</div>
        </div>
      </div>
    </section>

    <!-- Dashboard carousel -->
    <section class="max-w-7xl mx-auto px-4 py-12">
      <h2 class="text-2xl md:text-3xl font-bold mb-6">Aperçu du dashboard</h2>
      <div class="relative border rounded-xl p-4 overflow-hidden" style="border-color: var(--tf-border); background: var(--tf-card);">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div *ngFor="let p of previews; index as i"
               class="rounded border p-3 transition hover:-translate-y-0.5"
               style="border-color: var(--tf-border);"
               [class.opacity-40]="i !== slideIndex()">
            <div class="h-36 bg-[var(--tf-surface-2)] rounded mb-2"></div>
            <div class="h-2 bg-[var(--tf-surface-2)] rounded w-2/3 mb-1"></div>
            <div class="h-2 bg-[var(--tf-surface-2)] rounded w-1/2"></div>
          </div>
        </div>
        <button class="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded border hover:bg-[var(--tf-surface-2)]"
                style="background: var(--tf-card); border-color: var(--tf-border);"
                (click)="prev()">‹</button>
        <button class="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded border hover:bg-[var(--tf-surface-2)]"
                style="background: var(--tf-card); border-color: var(--tf-border);"
                (click)="next()">›</button>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="max-w-7xl mx-auto px-4 py-12">
      <h2 class="text-2xl md:text-3xl font-bold mb-6">Tarifs</h2>
      <div class="grid md:grid-cols-3 gap-4">
        <div *ngFor="let p of pricing" class="border rounded-xl p-4" style="border-color: var(--tf-border); background: var(--tf-card);">
          <div class="font-semibold text-lg mb-2">{{ p.name }}</div>
          <div class="text-3xl font-extrabold mb-2">{{ p.price }}</div>
          <ul class="text-sm muted space-y-1 mb-3">
            <li *ngFor="let i of p.includes">• {{ i }}</li>
          </ul>
          <a routerLink="/auth/register" class="inline-flex items-center rounded px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary-600">
            Commencez gratuitement
          </a>
        </div>
      </div>
    </section>

    <!-- (section Témoignages supprimée selon la demande) -->

    <!-- Why TaskFlow -->
    <section class="max-w-7xl mx-auto px-4 py-12">
      <h2 class="text-2xl md:text-3xl font-bold mb-6">Pourquoi TaskFlow ?</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="p-4 border rounded-xl" style="border-color: var(--tf-border); background: var(--tf-card);">
          <div class="font-semibold">UX intuitif</div>
          <div class="text-sm muted mt-1">Onboarding rapide, productif dès le premier jour.</div>
        </div>
        <div class="p-4 border rounded-xl" style="border-color: var(--tf-border); background: var(--tf-card);">
          <div class="font-semibold">Sécurité multi-tenant</div>
          <div class="text-sm muted mt-1">Isolation stricte par tenant, bonnes pratiques.</div>
        </div>
        <div class="p-4 border rounded-xl" style="border-color: var(--tf-border); background: var(--tf-card);">
          <div class="font-semibold">Rapports avancés</div>
          <div class="text-sm muted mt-1">KPIs, export, et vues personnalisées.</div>
        </div>
      </div>
    </section>

    <section class="relative py-16 bg-slate-950 text-white">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl"></div>
      </div>
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="text-2xl md:text-3xl font-bold mb-8">Vos données restent en Tunisie. Point final.</h2>
        <div class="grid md:grid-cols-3 gap-4">
          <div class="rounded-2xl border border-transparent bg-white/5 backdrop-blur p-6 hover:border-primary-500 transition">
            <div class="text-2xl mb-2">🔒</div>
            <div class="font-semibold mb-1">Hébergement 100% Tunisien</div>
            <div class="text-sm text-slate-300">Serveurs OVH Tunis, aucun transfert hors frontières</div>
          </div>
          <div class="rounded-2xl border border-transparent bg-white/5 backdrop-blur p-6 hover:border-primary-500 transition">
            <div class="text-2xl mb-2">📋</div>
            <div class="font-semibold mb-1">Conformité INPDP</div>
            <div class="text-sm text-slate-300">Respect total de la loi organique n°2004-63</div>
          </div>
          <div class="rounded-2xl border border-transparent bg-white/5 backdrop-blur p-6 hover:border-primary-500 transition">
            <div class="text-2xl mb-2">🏦</div>
            <div class="font-semibold mb-1">Paiement Local</div>
            <div class="text-sm text-slate-300">Intégration avec les banques tunisiennes et Sobflous</div>
          </div>
        </div>
      </div>
    </section>
    <section class="max-w-7xl mx-auto px-4 py-12">
      <h2 class="text-2xl md:text-3xl font-bold mb-6">Notre équipe</h2>
      <div class="flex flex-wrap gap-4">
        <div *ngFor="let a of team" class="w-14 h-14 rounded-full overflow-hidden border" style="animation: tf-fade-in .4s ease; background: var(--tf-surface-2); border-color: var(--tf-border);">
          <img [src]="a" alt="avatar" class="w-full h-full object-cover"/>
        </div>
      </div>
    </section>

    <!-- CTA band -->
    <section class="max-w-7xl mx-auto px-4 py-12">
      <div class="p-6 border rounded-xl flex flex-col md:flex-row items-center justify-between gap-3" style="border-color: var(--tf-border); background: var(--tf-card);">
        <div class="text-lg font-semibold">Essayez TaskFlow gratuitement</div>
        <a routerLink="/auth/register" class="inline-flex items-center rounded px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary-600">
          S’inscrire
        </a>
      </div>
    </section>

    <!-- Newsletter -->
    <section id="blog" class="max-w-7xl mx-auto px-4 py-12">
      <div class="p-6 border rounded-xl" style="border-color: var(--tf-border); background: var(--tf-card);">
        <div class="font-semibold mb-1">Recevez nos conseils</div>
        <div class="text-sm muted mb-3">Recevez nos conseils pour mieux gérer votre entreprise</div>
        <form class="flex flex-col sm:flex-row gap-2" (submit)="subscribe($event)">
          <input name="email" type="email" required placeholder="votre@email.tn"
                 class="flex-1 rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                 style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"/>
          <button class="rounded px-4 py-2 bg-primary text-white hover:bg-primary-600">S’abonner</button>
        </form>
        <div *ngIf="subscribed()" class="text-primary-600 text-sm mt-2">Merci, vous êtes inscrit !</div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t py-8" style="border-color: var(--tf-border);">
      <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-sm muted">
        <div class="flex items-center gap-2">
          <img src="/TASKFLOW-removebg-preview.png" alt="TaskFlow" class="h-16 md:h-20 w-auto max-w-[280px] object-contain" />
          <span>TaskFlow</span>
        </div>
        <div class="flex items-center gap-4">
          <a href="#" class="hover:text-[color:var(--tf-on-surface)]">Contact</a>
          <a href="#" class="hover:text-[color:var(--tf-on-surface)]">FAQ</a>
          <a href="#" class="hover:text-[color:var(--tf-on-surface)]">Politique de confidentialité</a>
        </div>
        <div class="opacity-70">© {{ year }} TaskFlow</div>
      </div>
    </footer>
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  private theme = inject(ThemeService);
  private router = inject(Router);

  year = new Date().getFullYear();
  subscribed = signal(false);
  slideIndex = signal(0);
  private timer: any;
  tabDefs = [
    { key: 'accounting', label: 'Accounting' },
    { key: 'sales', label: 'Sales & Get Paid' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'expenses', label: 'Expenses & Bills' },
    { key: 'hub', label: 'Customer Hub' }
  ];
  taskCount = signal(0);
  clientCount = signal(0);
  invoiceCount = signal(0);
  acctAgent = signal(0);
  financeAgent = signal(0);
  custAgent = signal(0);
  leads = signal(0);
  proposals = signal(0);
  contracts = signal(0);
  projects = signal(0);
  revenue = signal(0);
  currentBalance = signal(0);
  barA = signal(10);
  barB = signal(10);
  barC = signal(10);
  lineReady = signal(false);
  tooltip = { visible: false, x: 0, y: 0, text: '', kind: '' as 'bars' | 'line' | '' };
  cardReady = signal(false);
  heroReady = signal(false);
  hoveredCard = signal(-1);
  activeTab = signal(0);
  agents = signal<Array<{ title: string; value: number; suffix: string; money?: boolean }>>([
    { title: 'Agent Comptable', value: 0, suffix: 'factures traitées' },
    { title: 'Agent Dépenses', value: 0, suffix: 'suivis', money: true },
    { title: 'Agent Client', value: 0, suffix: 'nouveaux leads' }
  ]);
  donut = signal({ infra: 35, mkt: 25, rh: 20, other: 20 });
  dashTotal = 320;
  lineOffset = signal(320);
  activeCard = signal(0);
  private cardTimer: any;
  cardTabs = [
    { label: 'Accounting', title: 'Accounting Agent', subtitle: 'Transactions categorized', target: 19, count: signal(0) },
    { label: 'Sales & Get Paid', title: 'Sales Agent', subtitle: 'Sales are back on track', target: 4733, count: signal(0) },
    { label: 'Marketing', title: 'Customer Agent', subtitle: 'New leads ready for review', target: 2, count: signal(0) },
    { label: 'Expenses & Bills', title: 'Expense Agent', subtitle: 'Bills processed', target: 34, count: signal(0) },
    { label: 'Customer Hub', title: 'Customer Agent', subtitle: 'Open tickets', target: 7, count: signal(0) },
  ];
  balances = [
    { amount: 19340, label: 'Chequing account' },
    { amount: 4340, label: 'Mastercard' }
  ];
  bars = signal<number[]>([10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10]);

  features = [
    { title: 'Gestion centralisée', desc: 'Tâches, clients, finances.', icon: 'M3 13h18v-2H3zm7-9h4v4h-4zM5 19h14v-6H5z' },
    { title: 'Multi‑tenant', desc: 'Séparez vos entités.', icon: 'M3 3h18v4H3zm0 7h18v4H3zm0 7h18v4H3z' },
    { title: 'Dashboard temps réel', desc: 'KPIs instantanés.', icon: 'M5 9h4v10H5zm5 4h4v6h-4zm5-8h4v14h-4z' },
    { title: 'Notifications', desc: 'Alertes et rappels.', icon: 'M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z' },
    { title: 'Mobile-friendly', desc: 'Responsive d’abord.', icon: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
    { title: 'Sécurité', desc: 'Bonnes pratiques intégrées.', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }
  ];

  previews = [1, 2, 3];

  pricing = [
    { name: 'Free', price: '0 TND', includes: ['1 entreprise', 'Jusqu’à 3 utilisateurs', 'Dashboard de base'] },
    { name: 'Pro', price: '49 TND/mois', includes: ['Multi-entreprises', 'Utilisateurs illimités', 'Rapports & exports'] },
    { name: 'Enterprise', price: 'Contact', includes: ['SLA & support', 'SSO', 'Intégrations avancées'] }
  ];
  steps = [
    { title: 'Créez un compte', desc: 'Inscrivez-vous en quelques secondes.' },
    { title: 'Configurez votre entreprise', desc: 'Définissez vos équipes et paramètres.' },
    { title: 'Gérez tâches & finances', desc: 'Suivez activités, factures et dépenses.' }
  ];
  private animateCount(target: number, setter: (n: number) => void, duration = 1200) {
    const start = performance.now();
    const begin = 0;
    const diff = target - begin;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setter(Math.floor(begin + diff * p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  testimonials = [
    { title: 'Secure, and user‑friendly', subtitle: 'Account holder since 2015' },
    { title: 'Banking made hassle‑free', subtitle: 'Account holder since 2021' },
    { title: 'Helpful banking support', subtitle: 'Account holder since 2020' }
  ];
  metrics = [
    { label: 'Bank interest', value: 76 },
    { label: 'Crypto Currency', value: 58 },
    { label: 'Share Market', value: 83 }
  ];
  team = [
    'https://i.pravatar.cc/80?img=12',
    'https://i.pravatar.cc/80?img=24',
    'https://i.pravatar.cc/80?img=36',
    'https://i.pravatar.cc/80?img=48',
    'https://i.pravatar.cc/80?img=60'
  ];

  ngOnInit() {
    this.timer = setInterval(() => this.next(), 4000);
    this.animateCount(19, n => this.acctAgent.set(n));
    this.animateCount(4733, n => this.financeAgent.set(n));
    this.animateCount(2, n => this.custAgent.set(n));
    this.animateCount(10, n => this.leads.set(n));
    this.animateCount(7, n => this.proposals.set(n));
    this.animateCount(3, n => this.contracts.set(n));
    this.animateCount(3, n => this.projects.set(n));
    this.animateCount(8040, n => this.revenue.set(n));
    this.animateCount(12313, n => this.currentBalance.set(n));
    this.setTab(0);
    this.setActive(0);
    this.startCardsCycle();
    setTimeout(() => {
      this.bars.set([18,42,28,55,46,68,52,61,38,57,49,72,30,22,44,60]);
    }, 50);
    setTimeout(() => {
      this.heroReady.set(true);
      this.cardReady.set(true);
      this.lineOffset.set(0);
    }, 150);
    setInterval(() => {
      this.invoiceCount.update(v => v + Math.floor(Math.random() * 3));
    }, 4000);
    setInterval(() => {
      const delta = Math.random() * 8 - 4;
      this.barB.set(Math.max(10, Math.min(90, this.barB() + delta)));
    }, 5000);
  }
  ngOnDestroy() {
    clearInterval(this.timer);
    clearInterval(this.cardTimer);
  }
  next() {
    this.slideIndex.update(v => (v + 1) % this.previews.length);
  }
  prev() {
    this.slideIndex.update(v => (v - 1 + this.previews.length) % this.previews.length);
  }
  subscribe(event: Event) {
    event.preventDefault();
    this.subscribed.set(true);
  }
  toggleDark() {
    this.theme.toggle();
  }
  hoverTab(i: number) {}
  showBarsTip(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    const idx = Math.max(0, Math.min(this.bars().length - 1, Math.floor((x / r.width) * this.bars().length)));
    const v = Math.round(this.bars()[idx]);
    this.tooltip = { visible: true, x: x + 8, y: e.clientY - r.top - 28, text: v + '%', kind: 'bars' };
  }
  hideTip() {
    this.tooltip.visible = false;
  }
  hoverCard(i: number) {
    this.hoveredCard.set(i);
  }
  setActive(i: number) {
    this.activeCard.set(i);
    const c = this.cardTabs[i];
    this.animateCount(c.target, n => c.count.set(n), 900);
  }
  startCardsCycle() {
    this.cardTimer = setInterval(() => {
      const i = (this.activeCard() + 1) % this.cardTabs.length;
      this.setActive(i);
    }, 2800);
  }
  pauseCards() {
    clearInterval(this.cardTimer);
  }
  resumeCards() {
    this.startCardsCycle();
  }
  formatMoney(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }
  setTab(i: number) {
    this.activeTab.set(i);
    if (i === 0) {
      const data = [
        { title: 'Agent Comptable', value: 19, suffix: 'factures traitées' },
        { title: 'Agent Dépenses', value: 4733, suffix: 'suivis', money: true },
        { title: 'Agent Client', value: 2, suffix: 'nouveaux leads' }
      ];
      this.updateAgents(data);
      this.bars.set([18,42,28,55,46,68,52,61,38,57,49,72,30,22,44,60]);
      this.donut.set({ infra: 35, mkt: 25, rh: 20, other: 20 });
    } else if (i === 2) {
      const data = [
        { title: 'Agent Marketing', value: 5, suffix: 'campagnes actives' },
        { title: 'Agent Email', value: 340, suffix: 'emails envoyés' },
        { title: 'Agent SEO', value: 12, suffix: 'nouveaux visiteurs' }
      ];
      this.updateAgents(data);
      this.bars.set([22,18,40,26,48,34,56,28,42,24,38,46,30,36,50,44]);
      this.donut.set({ infra: 20, mkt: 45, rh: 15, other: 20 });
    } else if (i === 3) {
      const data = [
        { title: 'Agent Dépenses', value: 8, suffix: 'factures en attente' },
        { title: 'Agent Budget', value: 4200, suffix: 'TND utilisés', money: true },
        { title: 'Agent TVA', value: 756, suffix: 'TND de TVA', money: true }
      ];
      this.updateAgents(data);
      this.bars.set([12,20,18,26,22,28,24,32,30,26,24,22,20,18,16,14]);
      this.donut.set({ infra: 40, mkt: 15, rh: 25, other: 20 });
    } else {
      const data = [
        { title: 'Agent Comptable', value: 10, suffix: 'transactions' },
        { title: 'Agent Dépenses', value: 2200, suffix: 'TND suivis', money: true },
        { title: 'Agent Client', value: 1, suffix: 'lead' }
      ];
      this.updateAgents(data);
      this.bars.set([15,25,20,35,30,28,40,32,22,26,18,24,30,28,26,22]);
      this.donut.set({ infra: 30, mkt: 20, rh: 30, other: 20 });
    }
    this.lineOffset.set(this.dashTotal);
    setTimeout(() => this.lineOffset.set(0), 100);
  }
  updateAgents(list: Array<{ title: string; value: number; suffix: string; money?: boolean }>) {
    this.agents.set(list.map(a => ({ ...a, value: 0 })));
    list.forEach((a, idx) => {
      this.animateCount(a.value, n => {
        const copy = this.agents().slice();
        copy[idx] = { ...copy[idx], value: n, money: a.money };
        this.agents.set(copy);
      }, 900);
    });
  }
  goToLogin() {
    localStorage.removeItem('token');
    localStorage.removeItem('taskflow-token');
    localStorage.removeItem('taskflow-user');
    this.router.navigateByUrl('/auth/login');
  }
  donutBg(): string {
    const d = this.donut();
    const p1 = d.infra;
    const p2 = p1 + d.mkt;
    const p3 = p2 + d.rh;
    return `conic-gradient(#10b981 0 ${p1}%, #3b82f6 ${p1}% ${p2}%, #f59e0b ${p2}% ${p3}%, #94a3b8 ${p3}% 100%)`;
  }
}
