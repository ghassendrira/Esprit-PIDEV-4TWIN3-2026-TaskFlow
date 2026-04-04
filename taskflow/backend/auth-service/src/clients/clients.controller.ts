import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ClientsService } from './clients.service.js';

@Controller('clients')
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Get('by-business/:businessId')
  listByBusiness(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    return this.service.listByBusiness(authorization, tenantId, businessId);
  }

  @Post()
  create(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body()
    body: {
      businessId: string;
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      taxNumber?: string;
    },
  ) {
    return this.service.create(authorization, tenantId, body);
  }

  @Get(':id')
  get(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.get(authorization, tenantId, id);
  }

  @Patch(':id')
  update(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      taxNumber?: string;
    },
  ) {
    return this.service.update(authorization, tenantId, id, body);
  }

  @Delete(':id')
  remove(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.remove(authorization, tenantId, id);
  }
}
