import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types';
import { AdminService } from './admin.service';
import { RejectRequestDto } from './dto/reject-request.dto';
import { RegistrationStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('registration-requests')
  async list(@Query('status') status?: RegistrationStatus) {
    return this.admin.listRequests(status ?? RegistrationStatus.PENDING);
  }

  @Post('registration-requests/:id/approve')
  async approve(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.admin.approveRequest(id, user.id);
  }

  @Post('registration-requests/:id/reject')
  async reject(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
  ) {
    return this.admin.rejectRequest(id, user.id, dto.reason);
  }
}
