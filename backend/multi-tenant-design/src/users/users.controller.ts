import { Controller, Post, Get, Body, UseGuards, Req, ForbiddenException, Headers } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../entities/User.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  async createEmployee(
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string,
    @Body() userData: { email: string, role: string, firstName: string, lastName: string }
  ) {
    // Check if the current user is an owner or admin
    if (req.user.role !== UserRole.OWNER && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only owners or admins can create users');
    }

    // Use the tenantId from header or from the user's active context
    const activeCompanyId = tenantId || req.user.company_id;
    
    if (!activeCompanyId) {
      throw new ForbiddenException('No active company context');
    }

    // Map frontend roles to internal roles if necessary, or pass them directly
    // Your roles: Accountant / Admin / Team-Member
    const createdUser = await this.authService.createUser(activeCompanyId, {
      email: userData.email,
      role: userData.role,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });

    // Add email notification logic
    try {
      const notifBase = (process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004').replace(/\/+$/, '');
      await fetch(`${notifBase}/notification/employee-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createdUser.email,
          fullName: `${createdUser.firstName || ''} ${createdUser.lastName || ''}`.trim(),
          role: userData.role,
          tempPassword: 'temporary_password',
          companyName: 'Votre entreprise',
        }),
      });
    } catch (e) {
      console.error('Failed to send welcome email:', e);
    }

    return createdUser;
  }

  @Get('list')
  @UseGuards(AuthGuard('jwt'))
  async listEmployees(
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string
  ) {
    const activeCompanyId = tenantId || req.user.company_id;
    
    if (!activeCompanyId) {
      throw new ForbiddenException('No active company context');
    }

    // This method needs to be implemented in AuthService or here directly via repository
    // For now, let's assume we want to fetch users belonging to this company_id
    // I will return the logic to fetch them filtered by company_id
    return this.authService.getUsersByCompany(activeCompanyId);
  }
}
