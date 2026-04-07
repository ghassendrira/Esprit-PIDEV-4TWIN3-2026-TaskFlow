import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'tf-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NavbarComponent, NgIf],
  template: `
    <div class="min-h-screen flex flex-col" style="background: var(--tf-surface); color: var(--tf-on-surface);">
      <tf-navbar (menuToggle)="toggleSidebar()"></tf-navbar>
      
      <div class="flex flex-1 relative overflow-hidden">
        <!-- Overlay for mobile sidebar -->
        <div *ngIf="mobileOpen" 
             (click)="mobileOpen = false"
             class="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300 animate-fade-in">
        </div>

        <!-- Desktop Sidebar -->
        <aside *ngIf="desktopOpen" class="hidden md:block w-64 border-r shrink-0 transition-all duration-300" 
               style="border-color: var(--tf-border); background: var(--tf-card);">
          <tf-sidebar></tf-sidebar>
        </aside>

        <!-- Mobile Sidebar -->
        <aside class="md:hidden fixed inset-y-0 left-0 w-72 z-40 transition-transform duration-300 ease-out shadow-2xl"
               style="background: var(--tf-card); border-right: 1px solid var(--tf-border);"
               [class.-translate-x-full]="!mobileOpen">
          <tf-sidebar (navigate)="mobileOpen = false"></tf-sidebar>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full min-w-0">
          <div class="max-w-7xl mx-auto animate-[tf-fade-in_.24s_ease]">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .-translate-x-full { transform: translateX(-100%); }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    :host { display: block; height: 100vh; }
  `]
})
export class LayoutComponent {
  private auth = inject(AuthService);
  mobileOpen = false;
  desktopOpen = true;

  constructor() {}

  toggleSidebar() {
    const isDesktop =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 768px)').matches;

    if (isDesktop) {
      this.desktopOpen = !this.desktopOpen;
      return;
    }

    this.mobileOpen = !this.mobileOpen;
  }
}
