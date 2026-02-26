import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types';
import { SetSecurityQuestionsDto } from './dto/set-security-questions.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me/companies')
  async myCompanies(@CurrentUser() user: RequestUser) {
    return this.users.getMyCompanies(user.id);
  }

  @Put('me/security-questions')
  async setSecurityQuestions(
    @CurrentUser() user: RequestUser,
    @Body() dto: SetSecurityQuestionsDto,
  ) {
    return this.users.setSecurityQAs(user.id, dto.qas);
  }
}
