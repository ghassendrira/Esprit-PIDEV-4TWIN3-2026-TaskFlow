import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <div class="shell-container">
      <header class="header">
        <div class="header-content">
          <h1 class="logo" routerLink="/">TaskFlow</h1>
          <nav class="nav">
            <a routerLink="/companies" routerLinkActive="active">Companies</a>
            <a *ngIf="auth.state().platformRole === 'PLATFORM_ADMIN'" routerLink="/admin/requests" routerLinkActive="active">Admin Requests</a>
            <a routerLink="/security-questions" routerLinkActive="active">Security</a>
          </nav>
          <div class="auth-section">
            <ng-container *ngIf="auth.state().accessToken; else guest">
              <span class="user-info">
                {{ auth.state().platformRole }}
              </span>
              <button class="logout-btn" (click)="logout()">Logout</button>
            </ng-container>
            <ng-template #guest>
              <a routerLink="/login" class="login-link">Login</a>
              <a routerLink="/register" class="register-link">Register</a>
            </ng-template>
          </div>
        </div>
      </header>

      <main class="main-content">
        <div class="container">
          <router-outlet />
        </div>
      </main>

      <footer class="footer">
        <div class="container">
          <p>&copy; 2026 TaskFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .shell-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .header {
      background-color: var(--surface-color);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 0 16px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      height: 64px;
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .logo {
      font-size: 1.5rem;
      margin: 0;
      cursor: pointer;
      color: var(--primary-color);
      white-space: nowrap;
    }

    .nav {
      display: flex;
      gap: 16px;
      flex: 1;
    }

    .nav a {
      color: var(--text-color);
      font-weight: 500;
      padding: 8px 0;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .nav a.active {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
    }

    .auth-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-info {
      font-size: 0.875rem;
      color: var(--text-muted);
      background: #eee;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .logout-btn {
      background: none;
      color: var(--text-color);
      border: 1px solid var(--border-color);
      padding: 6px 12px;
    }

    .logout-btn:hover {
      background: #f0f0f0;
    }

    .main-content {
      flex: 1;
      padding: 32px 16px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .footer {
      background-color: var(--surface-color);
      border-top: 1px solid var(--border-color);
      padding: 24px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .login-link, .register-link {
      padding: 8px 16px;
      border-radius: 4px;
    }

    .register-link {
      background-color: var(--primary-color);
      color: white !important;
    }
  `]
})
export class ShellComponent {
  constructor(
    readonly auth: AuthService,
    private readonly router: Router
  ) {}

  logout() {
    this.auth.clear();
    this.router.navigateByUrl('/login');
  }
}
