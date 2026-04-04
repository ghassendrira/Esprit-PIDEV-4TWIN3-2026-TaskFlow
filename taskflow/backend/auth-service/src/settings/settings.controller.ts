import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('tenant')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('current')
  tenant(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.service.getTenant(authorization, tenantId);
  }

  @Get('countries')
  countries() {
    return this.service.countries();
  }

  @Get('all')
  allTenants(@Headers('authorization') authorization: string) {
    return this.service.getAllTenants(authorization);
  }

  @Post('request')
  requestTenant(
    @Headers('authorization') authorization: string,
    @Body() dto: any,
  ) {
    return this.service.requestTenant(authorization, dto);
  }

  @Patch('update')
  updateTenant(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.service.updateTenant(authorization, dto, tenantId);
  }
}

@Controller('business')
export class BusinessSettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('list')
  businesses(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.service.getBusinesses(authorization, tenantId);
  }

  @Get('categories')
  categories() {
    return this.service.categories();
  }

  @Post('create')
  createBusiness(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateBusinessDto,
  ) {
    return this.service.createBusiness(authorization, dto, tenantId);
  }

  @Patch(':id/update')
  updateBusiness(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.service.updateBusiness(authorization, id, dto, tenantId);
  }
}
