import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '../roles/role.enum';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  private readonly logger = new Logger(ClientsController.name);

  constructor(private service: ClientsService) {}

  // ✅ POST /clients - Create client
  @Post()
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
    Role.TEAM_MEMBER,
  )
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
    this.logger.log(`POST /clients - Creating client: ${body.name}`);
    return this.service.create(body);
  }

  // ✅ GET /clients/all - SUPER_ADMIN uniquement
  @Get('all')
  @Roles(Role.SUPER_ADMIN)
  allClients() {
    this.logger.log('GET /clients/all');
    return this.service.allClients();
  }

  // ✅ GET /clients/by-business/:businessId
  @Get('by-business/:businessId')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
    Role.TEAM_MEMBER,
  )
  listByBusiness(
    @Param('businessId') businessId: string,
  ) {
    this.logger.log(`GET /clients/by-business/${businessId}`);
    return this.service.listByBusiness(businessId);
  }

  // ✅ GET /clients/:id
  @Get(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
    Role.TEAM_MEMBER,
  )
  get(@Param('id') id: string) {
    this.logger.log(`GET /clients/${id}`);
    return this.service.get(id);
  }

  // ✅ PATCH /clients/:id - Update client
  @Patch(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
  )
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
    this.logger.log(`PATCH /clients/${id}`);
    return this.service.update(id, body);
  }

  // ✅ DELETE /clients/:id - Delete client
  @Delete(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
  )
  remove(@Param('id') id: string) {
    this.logger.log(`DELETE /clients/${id}`);
    return this.service.softDelete(id);
  }
}
