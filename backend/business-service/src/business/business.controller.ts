import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BusinessService } from './business.service';

@Controller('businesses')
export class BusinessController {
  constructor(private service: BusinessService) {}

  @Post()
  create(
    @Body()
    body: {
      tenantId: string;
      ownerId?: string;
      name: string;
      logoUrl?: string;
      currency: string;
      taxRate: number;
      category?: string;
    },
  ) {
    return this.service.create(body);
  }

  @Get('all')
  allBusinesses() {
    return this.service.allBusinesses();
  }

  @Get('by-tenant/:tenantId')
  byTenant(@Param('tenantId') tenantId: string) {
    return this.service.byTenant(tenantId);
  }

  @Get('by-owner/:ownerId')
  byOwner(@Param('ownerId') ownerId: string) {
    return this.service.byOwner(ownerId);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.service.byId(id);
  }

  @Get('count-by-tenant/:tenantId')
  async countByTenant(@Param('tenantId') tenantId: string) {
    const count = await this.service.countByTenant(tenantId);
    return { count };
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      logoUrl?: string;
      currency?: string;
      taxRate?: number;
      category?: string;
    },
  ) {
    return this.service.update(id, body);
  }
}
