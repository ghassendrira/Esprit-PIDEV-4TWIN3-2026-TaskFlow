import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateEmployeeRequestDto } from './dto/create-employee-request.dto';
import { RegistrationsService } from '../registrations/registrations.service';

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly registrations: RegistrationsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const memberships = await this.companies.listForUser(user.id);
    return memberships.map((m) => ({
      companyId: m.companyId,
      role: m.role,
      company: m.company,
    }));
  }

  @Get(':companyId')
  async get(
    @CurrentUser() user: RequestUser,
    @Param('companyId') companyId: string,
  ) {
    return this.companies.getCompanyForMember(companyId, user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companies.createCompanyAsOwner(user.id, dto);
  }

  @Patch(':companyId')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.updateCompany(companyId, user.id, dto);
  }

  @Post(':companyId/user-requests')
  async createEmployeeRequest(
    @CurrentUser() user: RequestUser,
    @Param('companyId') companyId: string,
    @Body() dto: CreateEmployeeRequestDto,
  ) {
    const req = await this.companies.createEmployeeInviteRequest(
      companyId,
      user.id,
      dto,
    );
    await this.registrations.notifyAdminsNewRequest(req.id);
    return req;
  }
}
