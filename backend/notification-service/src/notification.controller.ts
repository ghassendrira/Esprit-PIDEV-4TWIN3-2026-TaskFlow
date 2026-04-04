import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @MessagePattern('send_welcome_email')
  async handleWelcomeEmail(
    @Payload() payload: { email: string; fullName: string; userId: string },
  ) {
    const { email, fullName, userId } = payload ?? ({} as any);
    await this.service.sendWelcomeEmail({ email, fullName, userId });
    return true;
  }
}
