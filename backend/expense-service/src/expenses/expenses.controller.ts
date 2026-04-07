import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Headers,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ExpensesService, UserContext } from './expenses.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ApproveRejectExpenseDto,
  ListExpensesDto,
  CreateCategoryDto,
} from './dto/index';
import { ExpenseGuard } from './guards/expense-ownership.guard';
import { Role } from '../roles/role.enum';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';

@Controller('expenses')
@UseGuards(ExpenseGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN, Role.ACCOUNTANT, Role.TEAM_MEMBER)
  create(@Body() createExpenseDto: CreateExpenseDto, @Req() req: any) {
    const ctx: UserContext = req.user;
    return this.expensesService.create(createExpenseDto, ctx);
  }

  @Get('categories')
  @Roles(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN, Role.ACCOUNTANT, Role.TEAM_MEMBER, Role.CLIENT)
  getCategories(@Headers('x-tenant-id') tenantId: string) {
    return this.expensesService.getCategories(tenantId);
  }

  @Get('by-business')
  @Roles(Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN, Role.ACCOUNTANT, Role.TEAM_MEMBER)
  async getExpensesByBusinessByHeader(
    @Headers('x-tenant-id') businessId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
  ) {
    const cleanBusinessId = businessId?.split(',')[0]?.trim();
    const cleanUserId = userId?.split(',')[0]?.trim();
    const cleanRole = role?.split(',')[0]?.trim();

    console.log('Role dans header:', role);
    console.log('Role nettoyé:', cleanRole);

    return this.expensesService.getExpensesByBusiness(
      cleanBusinessId,
      cleanUserId,
      cleanRole,
    );
  }

  @Get('by-business/:businessId')
  @Roles(Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN, Role.ACCOUNTANT, Role.TEAM_MEMBER)
  getExpensesByBusiness(
    @Param('businessId') businessId: string,
    @Req() req: any,
  ) {
    const ctx: UserContext = req.user;

    if (businessId !== ctx.businessId) {
      throw new ForbiddenException('Business ID mismatch with tenant context');
    }

    return this.expensesService.getExpensesByBusiness(businessId, ctx.userId, ctx.role);
  }

  @Post('categories')
  @Roles(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN)
  createCategory(@Body() dto: CreateCategoryDto, @Req() req: any) {
    const ctx: UserContext = req.user;
    return this.expensesService.createCategory(dto, ctx);
  }

  @Post('initialize-categories/:businessId')
  @Roles(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN)
  initializeCategories(@Param('businessId') businessId: string) {
    return this.expensesService.initializeDefaultCategories(businessId);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN, Role.ACCOUNTANT, Role.TEAM_MEMBER, Role.CLIENT)
  findAll(@Query() filters: ListExpensesDto, @Req() req: any) {
    const ctx: UserContext = req.user;
    return this.expensesService.list(ctx, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const ctx: UserContext = req.user;
    return this.expensesService.findOne(id, ctx);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN, Role.ACCOUNTANT, Role.TEAM_MEMBER)
  update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Req() req: any,
  ) {
    const ctx: UserContext = req.user;
    return this.expensesService.update(id, updateExpenseDto, ctx);
  }

  @Patch(':id/approve')
  @Roles(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN, Role.ACCOUNTANT)
  approve(@Param('id') id: string, @Req() req: any) {
    const ctx: UserContext = req.user;
    return this.expensesService.approve(id, ctx);
  }

  @Patch(':id/reject')
  @Roles(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN, Role.ACCOUNTANT)
  reject(
    @Param('id') id: string,
    @Body() approveRejectDto: ApproveRejectExpenseDto,
    @Req() req: any,
  ) {
    const ctx: UserContext = req.user;
    return this.expensesService.reject(id, approveRejectDto, ctx);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.BUSINESS_ADMIN, Role.ACCOUNTANT, Role.TEAM_MEMBER)
  remove(@Param('id') id: string, @Req() req: any) {
    const ctx: UserContext = req.user;
    return this.expensesService.remove(id, ctx);
  }
}
