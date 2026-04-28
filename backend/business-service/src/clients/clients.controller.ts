import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Post()
  create(
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
    return this.service.create(body);
  }

  @Get('by-business/:businessId')
  listByBusiness(@Param('businessId') businessId: string) {
    return this.service.listByBusiness(businessId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  update(
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
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
