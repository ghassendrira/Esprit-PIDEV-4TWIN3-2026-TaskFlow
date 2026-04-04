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
    <div class="min-h-screen" style="background: var(--tf-surface); color: var(--tf-on-surface);">
      <tf-navbar (menuToggle)="toggleSidebar()"></tf-navbar>
      <div class="flex min-h-[calc(100vh-4rem)]">
        <aside *ngIf="desktopOpen" class="hidden md:block w-64" style="border-right: 1px solid var(--tf-border); background: var(--tf-card);">
          <tf-sidebar></tf-sidebar>
        </aside>
        <aside class="md:hidden fixed inset-y-0 left-0 w-72 z-40 transition-transform duration-200"
               style="background: var(--tf-card); border-right: 1px solid var(--tf-border);"
               [class.-translate-x-full]="!mobileOpen">
          <tf-sidebar (navigate)="mobileOpen = false"></tf-sidebar>
        </aside>
        <main class="flex-1 p-4 md:ml-0">
          <div class="max-w-7xl mx-auto animate-[tf-fade-in_.24s_ease]">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .-translate-x-full { transform: translateX(-100%); }
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
