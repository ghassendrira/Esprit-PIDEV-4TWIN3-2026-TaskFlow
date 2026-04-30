import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Logger, UseGuards, Req, Headers } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { CreateInvoiceDto, UpdateInvoiceDto } from './dto';
import { TenantGuard } from './tenant.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '../roles/role.enum';

@Controller('invoices')
@UseGuards(TenantGuard, JwtAuthGuard, RolesGuard)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);
  constructor(private service: InvoicesService) {}

  // ✅ GET /invoices - List all invoices for authenticated business
  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
    Role.TEAM_MEMBER,
  )
  async findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.logger.log(`[rid:${req.requestId || 'n/a'}] GET /invoices - TenantId: ${tenantId}`);
    try {
      // Extract first business from comma-separated list
      const businessId = tenantId?.split(',')[0]?.trim();
      return await this.service.listByBusiness(businessId, req.tenantId);
    } catch (err: any) {
      this.logger.error(`Error in findAll: ${err.message}`, err.stack);
      throw err;
    }
  }

  // ✅ GET /invoices/by-business/:businessId
  @Get('by-business/:businessId')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
    Role.TEAM_MEMBER,
  )
  async listByBusiness(
    @Param('businessId')    paramBid : string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id')   userId  : string,
    @Headers('x-employee-user-id') employeeUserId: string | undefined,
    @Req() req: any,
  ) {
    this.logger.log(`[rid:${req.requestId || 'n/a'}] GET /invoices/by-business/${paramBid}`);
    // Prendre le businessId depuis le paramètre URL en priorité
    const bid = paramBid || req.user?.businessId;

    if (!bid) {
      throw new BadRequestException(
        'businessId manquant'
      );
    }

    try {
      return await this.service.listByBusiness(bid, tenantId, userId, employeeUserId);
    } catch (err: any) {
      this.logger.error(`Error in listByBusiness: ${err.message}`, err.stack);
      throw err;
    }
  }

  // ✅ POST /invoices/report/unpaid
  @Post('report/unpaid')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
  )
  async generateUnpaidReport(@Body() body: { businessId: string }, @Req() req: any) {
    this.logger.log(`[rid:${req.requestId || 'n/a'}] POST /invoices/report/unpaid for business ${body.businessId}`);
    try {
      return await this.service.generateUnpaidReport(body.businessId, req.tenantId);
    } catch (err: any) {
      this.logger.error(`Error in generateUnpaidReport: ${err.message}`, err.stack);
      throw err;
    }
  }

  // ✅ POST /invoices - Create invoice
  @Post()
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
    Role.TEAM_MEMBER,
  )
  async create(
    @Body() dto: CreateInvoiceDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-business-id') businessIdHeader: string,
    @Headers('x-user-id') userId: string,
    @Req() req: any,
  ) {
    this.logger.log(`[rid:${req.requestId || 'n/a'}] POST /invoices - User: ${userId}, TenantId: ${tenantId}, BusinessId: ${businessIdHeader || req.businessId || dto.businessId}`);
    try {
      const companyId = tenantId?.split(',')[0]?.trim();
      const cleanUserId = userId?.split(',')[0]?.trim();
      const resolvedBusinessId =
        businessIdHeader?.split(',')[0]?.trim() ||
        req.businessId ||
        dto.businessId;

      return await this.service.create(
        {
          ...dto,
          businessId: resolvedBusinessId,
          companyId,
          createdBy: cleanUserId,
        },
        req.tenantId || companyId,
      );
    } catch (err: any) {
      this.logger.error(`Error in create: ${err.message}`, err.stack);
      throw err;
    }
  }

  // ✅ PATCH /invoices/:id - Update invoice
  @Patch(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
  )
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto, @Req() req: any) {
    return this.service.update(id, dto, req.tenantId);
  }

  // ✅ DELETE /invoices/:id - Delete invoice
  @Delete(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
  )
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.tenantId);
  }

  // ✅ GET /invoices/:id - Get single invoice
  @Get(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
    Role.TEAM_MEMBER,
  )
  async findOne(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`[rid:${req.requestId || 'n/a'}] GET /invoices/${id}`);
    return this.service.findOne(id, req.tenantId);
  }

  // ✅ POST /invoices/:id/send - Send invoice
  @Post(':id/send')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
  )
  async send(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`[rid:${req.requestId || 'n/a'}] POST /invoices/${id}/send`);
    return this.service.send(id, req.tenantId);
  }

  // ✅ POST /invoices/:id/smart-send - Smart send invoice
  @Post(':id/smart-send')
  @Roles(
    Role.SUPER_ADMIN,
    Role.BUSINESS_OWNER,
    Role.BUSINESS_ADMIN,
    Role.ACCOUNTANT,
  )
  async smartSend(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`[rid:${req.requestId || 'n/a'}] POST /invoices/${id}/smart-send`);
    return this.service.sendSmartEmail(id, req.tenantId);
  }
}
