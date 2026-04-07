import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ApproveRejectExpenseDto,
  ListExpensesDto,
  CreateCategoryDto,
} from './dto/index';
import { ExpenseStatus } from '@prisma/client';
import { Role } from '../roles/role.enum';

export interface UserContext {
  userId: string;
  role: string;
  businessId: string;
}

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(private prisma: PrismaService) {}

  private async createAuditLog(
    ctx: UserContext,
    action: string,
    expenseId?: string,
    details?: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        businessId: ctx.businessId,
        action,
        expenseId,
        details: details || {},
      },
    });
  }

  private async notify(recipientRoles: string[] | string, message: string, data?: any) {
    // Placeholder for actual notification logic (e.g., via RabbitMQ, Email, or WebSocket)
    const recipients = Array.isArray(recipientRoles) ? recipientRoles.join(', ') : recipientRoles;
    this.logger.log(`NOTIFICATION to [${recipients}]: ${message}`);
    if (data) this.logger.debug('Notification Data:', data);
  }

  async list(ctx: UserContext, filters: ListExpensesDto) {
    const where: any = {
      businessId: ctx.businessId,
      deletedAt: null,
    };

    // TEAM_MEMBER voit SEULEMENT ses propres expenses
    if (ctx.role === 'TEAM_MEMBER') {
      where.createdBy = ctx.userId;
    } else {
      // Tous les autres rôles voient TOUTES les expenses du business
      if (filters?.createdBy) {
        where.createdBy = filters.createdBy;
      }
    }

    if (filters?.status) where.status = filters.status;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    return this.prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExpensesByBusiness(businessId: string, userId: string, role: string) {
    const cleanBusinessId = businessId?.split(',')[0]?.trim();
    const cleanUserId = userId?.split(',')[0]?.trim();
    const normalizedRole = String(role || '').split(',')[0]?.trim().toUpperCase();

    if (!cleanBusinessId) {
      throw new BadRequestException('BusinessId invalide');
    }

    try {
      const where: any = {
        businessId: cleanBusinessId,
        deletedAt: null,
      };

      if (normalizedRole === Role.TEAM_MEMBER || normalizedRole === 'TEAM') {
        where.createdBy = cleanUserId;
      }

      return await this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to load expenses by business', error);
      throw new InternalServerErrorException('Erreur lors de la récupération des expenses');
    }
  }

  async getCategories(businessId: string) {
    const cleanBusinessId = businessId?.split(',')[0]?.trim();

    if (!cleanBusinessId) {
      throw new BadRequestException('businessId invalide');
    }

    return this.prisma.expenseCategory.findMany({
      where: {
        OR: [
          { businessId: null }, // Global categories
          { businessId: cleanBusinessId }, // Business-specific categories
        ],
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto, ctx: UserContext) {
    // Rôle : BUSINESS_OWNER, BUSINESS_ADMIN
    const allowedRoles = ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(ctx.role)) {
      throw new ForbiddenException('Only admins or owners can create categories');
    }

    const category = await this.prisma.expenseCategory.create({
      data: {
        ...dto,
        businessId: ctx.businessId,
      },
    });

    await this.createAuditLog(ctx, 'CREATE_CATEGORY', undefined, { categoryId: category.id, name: category.name });

    return category;
  }

  async initializeDefaultCategories(businessId: string) {
    const defaultCategories = [
      { name: 'Transport', description: 'Frais de transport' },
      { name: 'Repas', description: 'Frais de repas' },
      { name: 'Hébergement', description: 'Frais hébergement' },
      { name: 'Matériel', description: 'Achat matériel' },
      { name: 'Logiciel', description: 'Achat logiciel' },
      { name: 'Autre', description: 'Autres dépenses' },
    ];

    return this.prisma.expenseCategory.createMany({
      data: defaultCategories.map((cat) => ({
        ...cat,
        businessId,
      })),
      skipDuplicates: true,
    });
  }

  async findOne(id: string, ctx: UserContext) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId: ctx.businessId, deletedAt: null },
      include: { category: true },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    // TEAM_MEMBER : seulement ses propres expenses
    if (ctx.role === 'TEAM_MEMBER' && expense.createdBy !== ctx.userId) {
      throw new ForbiddenException('Access denied to this expense');
    }

    return expense;
  }

  async create(dto: CreateExpenseDto, ctx: UserContext) {
    // Tous les utilisateurs de la plateforme peuvent créer des expenses, PEU IMPORTE leur rôle.
    const expense = await this.prisma.expense.create({
      data: {
        amount: dto.amount,
        date: new Date(dto.date),
        description: dto.description || '',
        categoryId: dto.categoryId,
        receiptUrl: dto.receiptUrl || null,
        businessId: ctx.businessId,
        createdBy: ctx.userId,
        status: ExpenseStatus.PENDING,
      },
      include: { category: true },
    });

    await this.createAuditLog(ctx, 'CREATE_EXPENSE', expense.id, { amount: expense.amount });

    // Notifier ACCOUNTANT + BUSINESS_ADMIN après création
    await this.notify(
      ['ACCOUNTANT', 'BUSINESS_ADMIN'],
      `New expense created by ${ctx.userId} for amount ${expense.amount}`,
      { expenseId: expense.id, businessId: ctx.businessId },
    );

    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto, ctx: UserContext) {
    const expense = await this.findOne(id, ctx);

    // TEAM_MEMBER : seulement si statut = PENDING
    if (ctx.role === 'TEAM_MEMBER' && expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException('TEAM_MEMBER can only update expenses in PENDING status');
    }

    // Autres rôles : peuvent modifier sans restriction (findOne a déjà vérifié l'isolation businessId)

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.receiptUrl !== undefined ? { receiptUrl: dto.receiptUrl } : {}),
      },
      include: { category: true },
    });

    await this.createAuditLog(ctx, 'UPDATE_EXPENSE', id, dto);

    return updated;
  }

  async approve(id: string, ctx: UserContext) {
    // Rôles : ACCOUNTANT, BUSINESS_ADMIN, BUSINESS_OWNER, SUPER_ADMIN
    const allowedRoles = ['ACCOUNTANT', 'BUSINESS_ADMIN', 'BUSINESS_OWNER', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(ctx.role)) {
      throw new ForbiddenException('Only ACCOUNTANT, ADMIN or OWNER can approve expenses');
    }

    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId: ctx.businessId, deletedAt: null },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: ExpenseStatus.APPROVED },
    });

    await this.createAuditLog(ctx, 'APPROVE_EXPENSE', id);

    // Notifier le créateur de l'expense
    await this.notify(
      expense.createdBy,
      `Your expense of ${expense.amount} has been APPROVED`,
      { expenseId: id },
    );

    return updated;
  }

  async reject(id: string, dto: ApproveRejectExpenseDto, ctx: UserContext) {
    // Rôles : ACCOUNTANT, BUSINESS_ADMIN, BUSINESS_OWNER, SUPER_ADMIN
    const allowedRoles = ['ACCOUNTANT', 'BUSINESS_ADMIN', 'BUSINESS_OWNER', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(ctx.role)) {
      throw new ForbiddenException('Only ACCOUNTANT, ADMIN or OWNER can reject expenses');
    }

    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId: ctx.businessId, deletedAt: null },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { 
        status: ExpenseStatus.REJECTED,
        rejectionReason: dto.reason
      },
    });

    await this.createAuditLog(ctx, 'REJECT_EXPENSE', id, { reason: dto.reason });

    // Notifier le créateur avec la raison
    await this.notify(
      expense.createdBy,
      `Your expense of ${expense.amount} has been REJECTED. Reason: ${dto.reason}`,
      { expenseId: id, reason: dto.reason },
    );

    return updated;
  }

  async remove(id: string, ctx: UserContext) {
    const expense = await this.findOne(id, ctx);

    // Créateur de l'expense uniquement (findOne a déjà vérifié si TEAM_MEMBER possède l'expense)
    if (expense.createdBy !== ctx.userId && ctx.role === 'TEAM_MEMBER') {
      throw new ForbiddenException('Only the creator can delete this expense');
    }

    // TEAM_MEMBER : seulement si status = PENDING
    if (ctx.role === 'TEAM_MEMBER' && expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException('TEAM_MEMBER can only delete expenses in PENDING status');
    }

    // Autres rôles : peuvent supprimer sans restriction (si même business)
    // findOne a déjà vérifié l'isolation businessId.

    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.createAuditLog(ctx, 'DELETE_EXPENSE', id);

    return { success: true };
  }
}
