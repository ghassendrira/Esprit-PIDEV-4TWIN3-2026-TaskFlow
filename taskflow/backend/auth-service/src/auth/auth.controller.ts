import { Body, Controller, Headers, Post, Get, Param, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SecurityQuestionsDto } from './dto/security-questions.dto';
import {
  ForgotPasswordDto,
  VerifySecurityQuestionDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private jwtService: JwtService,
  ) {}

  @Post('signup')
  async signUp(@Body() body: SignUpDto) {
    return this.auth.signup(body);
  }

  @Post('signin')
  async signIn(@Body() body: any) {
    const { email, password } = body ?? {};
    const res = await this.auth.signin(email, password);
    return res;
  }

  // TASK 9: 2FA Endpoints
  @Post('2fa/generate')
  async generate2fa(@Headers('authorization') auth: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = auth.substring('Bearer '.length);
    const payload = await this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });
    return this.auth.generate2faSecret(payload.sub);
  }

  @Post('2fa/enable')
  async enable2fa(@Headers('authorization') auth: string, @Body('otp') otp: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = auth.substring('Bearer '.length);
    const payload = await this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_SECRET ?? 'change-me',
    });
    return this.auth.enable2fa(payload.sub, otp);
  }

  @Post('2fa/verify')
  async verify2fa(@Body() body: { userId: string; otp: string }) {
    return this.auth.verify2faAndLogin(body.userId, body.otp);
  }

  @Post('change-password')
  async changePassword(
    @Headers('authorization') authorization: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(authorization, dto);
  }

  @Post('security-questions')
  async setSecurityQuestions(
    @Headers('authorization') authorization: string,
    @Body() dto: SecurityQuestionsDto,
  ) {
    return this.auth.setSecurityQuestions(authorization, dto);
  }

  @Get('security-questions')
  async getSecurityQuestions(@Headers('authorization') authorization: string) {
    return this.auth.getSecurityQuestions(authorization);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('forgot-password/email')
  async forgotPasswordEmail(@Body('email') email: string) {
    return this.auth.sendResetEmail(email);
  }

  @Post('forgot-password/contact-admin')
  async forgotPasswordContactAdmin(@Body('email') email: string) {
    return this.auth.contactAdminForReset(email);
  }

  @Get('password-reset-requests')
  async getPasswordResetRequests() {
    return this.auth.getPendingPasswordResetRequests();
  }

  @Post('password-reset-requests/:id/approve')
  async approvePasswordReset(@Param('id') id: string) {
    return this.auth.approvePasswordReset(id);
  }

  @Post('password-reset-requests/:id/reject')
  async rejectPasswordReset(@Param('id') id: string, @Body('reason') reason: string) {
    return this.auth.rejectPasswordReset(id, reason);
  }

  @Post('verify-security-answer')
  async verifySecurityAnswer(@Body() dto: VerifySecurityQuestionDto) {
    return this.auth.verifySecurityAnswer(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('switch-tenant/:id')
  async switchTenant(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    return this.auth.switchTenant(authorization, id);
  }
}
