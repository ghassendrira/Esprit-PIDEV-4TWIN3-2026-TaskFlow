import { Controller, Post, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../entities/User.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('companies')
  @UseGuards(AuthGuard('jwt'))
  async createCompany(@Req() req: any, @Body('name') name: string) {
    return this.authService.createCompany(req.user.id, name);
  }

  @Post('switch-company')
  @UseGuards(AuthGuard('jwt'))
  async switchCompany(@Req() req: any, @Body('companyId') companyId: string) {
    return this.authService.switchCompany(req.user.id, companyId);
  }

  @Post('users')
  @UseGuards(AuthGuard('jwt'))
  async createUser(
    @Req() req: any, 
    @Body() userData: { email: string, role: UserRole }
  ) {
    // Check if the current user is an owner or admin of the current company
    if (req.user.role !== UserRole.OWNER && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only owners or admins can create users');
    }
    
    return this.authService.createUser(req.user.company_id, userData);
  }
}
