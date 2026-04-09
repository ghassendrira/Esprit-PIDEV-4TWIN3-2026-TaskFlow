import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentCompanyId } from '../common/decorators/current-company-id.decorator';
import { Invoice } from '../entities/Invoice.entity';
import { Client } from '../entities/Client.entity';
import { Expense } from '../entities/Expense.entity';

@Controller('business')
@UseGuards(AuthGuard('jwt'), TenantGuard) // Apply multi-tenant context enforcement
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  // --- Invoices ---
  @Get('invoices')
  async getInvoices(@CurrentCompanyId() companyId: string) {
    return this.businessService.getInvoices(companyId);
  }

  @Get('invoices/:id')
  async getInvoiceById(
    @Param('id') id: string,
    @CurrentCompanyId() companyId: string
  ) {
    return this.businessService.getInvoiceById(id, companyId);
  }

  @Post('invoices')
  async createInvoice(
    @CurrentCompanyId() companyId: string,
    @Body() invoiceData: Partial<Invoice>
  ) {
    return this.businessService.createInvoice(companyId, invoiceData);
  }

  // --- Clients ---
  @Get('clients')
  async getClients(@CurrentCompanyId() companyId: string) {
    return this.businessService.getClients(companyId);
  }

  @Post('clients')
  async createClient(
    @CurrentCompanyId() companyId: string,
    @Body() clientData: Partial<Client>
  ) {
    return this.businessService.createClient(companyId, clientData);
  }

  // --- Expenses ---
  @Get('expenses')
  async getExpenses(@CurrentCompanyId() companyId: string) {
    return this.businessService.getExpenses(companyId);
  }

  @Post('expenses')
  async createExpense(
    @CurrentCompanyId() companyId: string,
    @Body() expenseData: Partial<Expense>
  ) {
    return this.businessService.createExpense(companyId, expenseData);
  }
}
