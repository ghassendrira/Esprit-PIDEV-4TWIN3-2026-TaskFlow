import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Post()
  create(
    @Body()
    body: {
      name: string;
      slug?: string;
      address?: string;
      country?: string;
      phone?: string;
      logoUrl?: string;
      branding?: Record<string, any>;
    },
  ) {
    return this.service.create(body);
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get('by-name/:name')
  byName(@Param('name') name: string) {
    return this.service.findByName(name);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      slug: string;
      address: string;
      country: string;
      phone: string;
      logoUrl: string;
      matricule: string;
      branding: Record<string, any>;
    }>,
  ) {
    return this.service.update(id, body);
  }
}
