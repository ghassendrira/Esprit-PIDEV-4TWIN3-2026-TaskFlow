import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';
import {
  RecoverGetQuestionsDto,
  RecoverResetDto,
  RecoverVerifyDto,
} from './dto/recover.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-company')
  async switchCompany(
    @CurrentUser() user: RequestUser,
    @Body() dto: SwitchCompanyDto,
  ) {
    return this.auth.switchCompany(user.id, dto.companyId);
  }

  @Post('recover/questions')
  async recoverQuestions(@Body() dto: RecoverGetQuestionsDto) {
    return this.auth.getRecoveryQuestions(dto.email);
  }

  @Post('recover/verify')
  async recoverVerify(@Body() dto: RecoverVerifyDto) {
    return this.auth.verifyRecoveryAnswers(dto.email, dto.answers);
  }

  @Post('recover/reset')
  async recoverReset(@Body() dto: RecoverResetDto) {
    return this.auth.resetPasswordWithRecoveryToken(
      dto.recoveryToken,
      dto.newPassword,
    );
  }
}
