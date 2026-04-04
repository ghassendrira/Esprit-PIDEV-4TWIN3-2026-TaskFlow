import { Routes } from '@angular/router';
import { authGuard, guestMatch, loggedInMatch } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'home',
    canMatch: [guestMatch], // guard ici
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home' 
  },
  {
    path: 'auth',
    canMatch: [guestMatch],
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'login' } // OK, redirection sans guard
    ]
  },
  {
    path: 'forgot-password',
    canMatch: [guestMatch],
    loadComponent: () =>
      import('./features/auth/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    canMatch: [guestMatch],
    loadComponent: () =>
      import('./features/auth/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    // Standalone page: no main layout/sidebar.
    path: 'change-password',
    canMatch: [loggedInMatch],
    loadComponent: () =>
      import('./features/auth/change-password.component').then(
        (m) => m.ChangePasswordComponent,
      ),
  },
  {
    path: '',
    canMatch: [loggedInMatch],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'invoices', loadComponent: () => import('./features/invoices/invoices.component').then(m => m.InvoicesComponent) },
      { path: 'expenses', loadComponent: () => import('./features/expenses/expenses.component').then(m => m.ExpensesComponent) },
      { path: 'clients', loadComponent: () => import('./features/clients/clients.component').then(m => m.ClientsComponent) },
      { path: 'team', loadComponent: () => import('./features/team/team.component').then(m => m.TeamComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
      {
        path: 'employees',
        loadComponent: () => import('./features/employees/employees-list.component').then(m => m.EmployeesListComponent)
      },
      {
        path: 'employees/create',
        loadComponent: () => import('./features/employees/create-employee.component').then(m => m.CreateEmployeeComponent)
      },
      {
        path: 'security-questions',
        loadComponent: () => import('./features/security/security-questions.component').then(m => m.SecurityQuestionsComponent),
      },
      {
        path: 'admin/registrations',
        loadComponent: () => import('./features/admin/admin-registrations.component').then(m => m.AdminRegistrationsComponent)
      },
      {
        path: 'admin/password-requests',
        loadComponent: () => import('./features/admin/admin-password-requests.component').then(m => m.AdminPasswordRequestsComponent)
      },
      {
        path: 'admin/roles',
        loadComponent: () => import('./features/admin/roles-permissions.component').then(m => m.RolesPermissionsComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' } // OK
    ]
  },
  {
    path: 'onboarding',
    canMatch: [loggedInMatch],
    children: [
      { path: 'company-setup', loadComponent: () => import('./features/onboarding/company-setup.component').then(m => m.CompanySetupComponent) },
      { path: 'create-business', loadComponent: () => import('./features/onboarding/create-business.component').then(m => m.CreateBusinessComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'company-setup' }
    ]
  },
  { path: '**', redirectTo: 'home' } // catch-all
];
