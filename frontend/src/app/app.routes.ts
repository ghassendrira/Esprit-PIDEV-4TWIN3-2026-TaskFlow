import { Routes } from '@angular/router';
import { LoginPage } from './pages/login.page';
import { RegisterOwnerPage } from './pages/register-owner.page';
import { ChangePasswordPage } from './pages/change-password.page';
import { CompaniesPage } from './pages/companies.page';
import { CompanyEditPage } from './pages/company-edit.page';
import { InviteEmployeePage } from './pages/invite-employee.page';
import { AdminRequestsPage } from './pages/admin-requests.page';
import { SecurityQuestionsPage } from './pages/security-questions.page';
import { ForgotPasswordPage } from './pages/forgot-password.page';
import { authGuard, mustChangePasswordGuard, platformAdminGuard } from './core/auth/auth.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: 'register', component: RegisterOwnerPage },
	{ path: 'login', component: LoginPage },
	{ path: 'forgot-password', component: ForgotPasswordPage },
	{ path: 'change-password', component: ChangePasswordPage, canActivate: [authGuard] },
	{
		path: 'companies',
		component: CompaniesPage,
		canActivate: [mustChangePasswordGuard],
	},
	{
		path: 'companies/:companyId/edit',
		component: CompanyEditPage,
		canActivate: [mustChangePasswordGuard],
	},
	{
		path: 'companies/:companyId/invite',
		component: InviteEmployeePage,
		canActivate: [mustChangePasswordGuard],
	},
	{
		path: 'admin/requests',
		component: AdminRequestsPage,
		canActivate: [platformAdminGuard],
	},
	{
		path: 'security-questions',
		component: SecurityQuestionsPage,
		canActivate: [authGuard],
	},
];

