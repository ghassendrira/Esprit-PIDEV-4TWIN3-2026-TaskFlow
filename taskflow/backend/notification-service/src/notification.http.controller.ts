import { Body, Controller, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationHttpController {
  constructor(private readonly service: NotificationService) {}

  @Post('welcome')
  async welcome(@Body() body: { email: string; fullName: string; userId: string }) {
    await this.service.sendWelcomeEmail({
      email: body?.email ?? '',
      fullName: body?.fullName ?? '',
      userId: body?.userId ?? '',
    });
    return { success: true };
  }

  @Post('admin-registration')
  async adminRegistration(@Body() body: any) {
    await this.service.sendAdminRegistrationNotification(body);
    return { success: true };
  }

  @Post('approval')
  async approval(@Body() body: any) {
    await this.service.sendApprovalEmail(body);
    return { success: true };
  }

  @Post('rejection')
  async rejection(@Body() body: any) {
    await this.service.sendRejectionEmail(body);
    return { success: true };
  }

  @Post('employee-welcome')
  async employeeWelcome(@Body() body: any) {
    await this.service.sendEmployeeWelcomeEmail(body);
    return { success: true };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    await this.service.sendResetPasswordEmail(body);
    return { success: true };
  }

  @Post('admin-password-request')
  async adminPasswordRequest(@Body() body: any) {
    await this.service.sendAdminPasswordRequestNotification(body);
    return { success: true };
  }
}
