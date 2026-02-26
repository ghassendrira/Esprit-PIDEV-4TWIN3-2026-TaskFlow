import { Body, Controller, Post } from '@nestjs/common';
import { CompanyOwnerRegistrationDto } from './dto/company-owner-registration.dto';
import { RegistrationsService } from './registrations.service';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post('company-owner')
  async registerCompanyOwner(@Body() dto: CompanyOwnerRegistrationDto) {
    return this.registrations.createCompanyOwnerSignup(dto);
  }
}
