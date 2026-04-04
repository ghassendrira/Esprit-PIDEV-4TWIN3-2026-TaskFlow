import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'tf-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NavbarComponent],
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-900">
      <tf-navbar (menuToggle)="mobileOpen = !mobileOpen"></tf-navbar>
      <div class="flex">
        <aside class="hidden md:block w-64 border-r border-slate-200 bg-white">
          <tf-sidebar></tf-sidebar>
        </aside>
        <aside class="md:hidden fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-40 transition-transform duration-200"
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

  constructor() {}
}
