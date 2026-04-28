import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CompanySetupDto } from './dto/company-setup.dto';
import { CreateBusinessDto } from './dto/create-business.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private service: OnboardingService) {}

  @Patch('company-setup')
  async companySetup(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CompanySetupDto,
  ) {
    return this.service.companySetup(authorization, dto, tenantId);
  }

  @Post('company-setup')
  async companySetupPost(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CompanySetupDto,
  ) {
    return this.service.companySetup(authorization, dto, tenantId);
  }

  @Post('create-business')
  async createBusiness(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateBusinessDto,
  ) {
    return this.service.createBusiness(authorization, dto, tenantId);
  }

  @Get('status')
  async status(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.service.status(authorization, tenantId);
  }
}
