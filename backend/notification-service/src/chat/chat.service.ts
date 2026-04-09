import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ChatPrismaService } from './prisma.service';
import {
  ChatMessage,
  ChatMessageKind,
  ChatRoomType,
  Prisma,
  PredefinedQuestion,
  PredefinedQuestionCategory,
  PredefinedQuestionResponseType,
} from '@prisma/client';

type ChatUserContext = {
  sub: string;
  name?: string;
  firstName?: string;
  email?: string;
  roles?: string[];
  tenantId?: string;
  company_id?: string;
};

type BusinessRecord = {
  id: string;
  tenantId?: string;
  name?: string;
  currency?: string;
  category?: string;
};

type ClientRecord = {
  id: string;
  name?: string;
  email?: string;
};

type InvoiceRecord = {
  id: string;
  clientId: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELED';
  dueDate: string;
  totalAmount: number;
  createdAt: string;
  payments?: Array<{ amount: number; paymentDate: string }>;
};

type QuestionCatalogItem = {
  code: string;
  label: string;
  category: PredefinedQuestionCategory;
  allowedRoles: string[];
  displayOrder: number;
  responseType: PredefinedQuestionResponseType;
  staticResponse?: string;
};

type QuestionResponse = {
  content: string;
  metadata?: Record<string, unknown>;
};

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

const QUESTION_CATALOG: QuestionCatalogItem[] = [
  {
    code: 'critical-actions-today',
    label: 'Quels sont les éléments critiques à traiter aujourd’hui ?',
    category: PredefinedQuestionCategory.BUSINESS,
    allowedRoles: ['OWNER', 'ACCOUNTANT', 'BUSINESS_OWNER', 'ADMIN'],
    displayOrder: 10,
    responseType: PredefinedQuestionResponseType.DYNAMIC,
  },
  {
    code: 'invoice-overview',
    label: 'Quel est l’état global de mes factures ?',
    category: PredefinedQuestionCategory.INVOICE,
    allowedRoles: ['OWNER', 'ACCOUNTANT', 'BUSINESS_OWNER', 'ADMIN'],
    displayOrder: 20,
    responseType: PredefinedQuestionResponseType.DYNAMIC,
  },
  {
    code: 'unpaid-invoices',
    label: 'Ai-je des factures impayées ?',
    category: PredefinedQuestionCategory.PAYMENT,
    allowedRoles: ['OWNER', 'ACCOUNTANT', 'BUSINESS_OWNER', 'ADMIN'],
    displayOrder: 30,
    responseType: PredefinedQuestionResponseType.DYNAMIC,
  },
  {
    code: 'latest-invoice-status',
    label: 'Quel est le statut de ma dernière facture ?',
    category: PredefinedQuestionCategory.INVOICE,
    allowedRoles: ['OWNER', 'ACCOUNTANT', 'BUSINESS_OWNER', 'ADMIN', 'TEAM'],
    displayOrder: 40,
    responseType: PredefinedQuestionResponseType.DYNAMIC,
  },
  {
    code: 'client-follow-up',
    label: 'Quels clients nécessitent un suivi ?',
    category: PredefinedQuestionCategory.BUSINESS,
    allowedRoles: ['OWNER', 'ACCOUNTANT', 'BUSINESS_OWNER', 'ADMIN'],
    displayOrder: 50,
    responseType: PredefinedQuestionResponseType.DYNAMIC,
  },
  {
    code: 'recommended-next-steps',
    label: 'Quelles sont les prochaines actions recommandées ?',
    category: PredefinedQuestionCategory.GENERAL,
    allowedRoles: ['OWNER', 'ACCOUNTANT', 'BUSINESS_OWNER', 'ADMIN', 'TEAM'],
    displayOrder: 60,
    responseType: PredefinedQuestionResponseType.MIXED,
  },
  {
    code: 'support-contact',
    label: 'Comment contacter le support ou l’admin ?',
    category: PredefinedQuestionCategory.SUPPORT,
    allowedRoles: ['OWNER', 'ACCOUNTANT', 'BUSINESS_OWNER', 'ADMIN', 'TEAM', 'SUPER_ADMIN'],
    displayOrder: 70,
    responseType: PredefinedQuestionResponseType.STATIC,
    staticResponse:
      'Utilisez le chat Support pour joindre l’équipe admin. Décrivez le blocage, ajoutez le contexte métier concerné et précisez si l’impact empêche la facturation, le paiement ou l’accès utilisateur.',
  },
  {
    code: 'team-priority-summary',
    label: 'Sur quoi l’équipe doit-elle se concentrer maintenant ?',
    category: PredefinedQuestionCategory.ADMIN,
    allowedRoles: ['OWNER', 'ADMIN', 'BUSINESS_OWNER', 'TEAM'],
    displayOrder: 80,
    responseType: PredefinedQuestionResponseType.MIXED,
  },
];

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly invoiceServiceUrl =
    process.env.INVOICE_SERVICE_URL || 'http://localhost:3005';
  private readonly businessServiceUrl =
    process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003';

  constructor(private prisma: ChatPrismaService) {}

  private normalizeRole(role?: string | null) {
    return String(role || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
  }

  private resolveUserName(user: ChatUserContext) {
    return user.name || user.firstName || user.email || 'User';
  }

  private resolvePrimaryRole(user: ChatUserContext) {
    return this.normalizeRole(user.roles?.[0] || 'TEAM_MEMBER');
  }

  private resolveTenantId(user: ChatUserContext) {
    return user.tenantId || user.company_id || null;
  }

  private resolveUserRoles(user: ChatUserContext) {
    return (user.roles || []).map((role) => this.normalizeRole(role));
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        this.logger.warn(`Upstream request failed (${response.status}) for ${url}`);
        return null;
      }
      return (await response.json()) as T;
    } catch (error: any) {
      this.logger.warn(`Upstream request error for ${url}: ${error.message}`);
      return null;
    }
  }

  private async ensureQuestionCatalog() {
    await Promise.all(
      QUESTION_CATALOG.map((question) =>
        this.prisma.predefinedQuestion.upsert({
          where: { code: question.code },
          create: question,
          update: {
            label: question.label,
            category: question.category,
            allowedRoles: question.allowedRoles,
            active: true,
            displayOrder: question.displayOrder,
            responseType: question.responseType,
            staticResponse: question.staticResponse ?? null,
          },
        }),
      ),
    );
  }

  private async touchRoom(roomId: string) {
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });
  }

  private async createRoomMessage(data: {
    roomId: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    content: string;
    kind?: ChatMessageKind;
    questionCode?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const message = await this.prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderRole: data.senderRole,
        content: data.content.trim(),
        kind: data.kind ?? ChatMessageKind.FREE_TEXT,
        questionCode: data.questionCode ?? null,
        metadata: (data.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });

    await this.touchRoom(data.roomId);
    return message;
  }

  private summarizeMoney(amount: number, currency = 'TND') {
    return `${amount.toFixed(2)} ${currency}`;
  }

  private async getBusinessRecord(businessId: string) {
    return this.fetchJson<BusinessRecord>(
      `${this.businessServiceUrl}/businesses/${encodeURIComponent(businessId)}`,
    );
  }

  private async getClientsForBusiness(businessId: string) {
    return (
      (await this.fetchJson<ClientRecord[]>(
        `${this.businessServiceUrl}/clients/by-business/${encodeURIComponent(businessId)}`,
      )) || []
    );
  }

  private async getInvoicesForBusiness(businessId: string, tenantId?: string | null) {
    if (!tenantId) {
      return null;
    }

    return this.fetchJson<InvoiceRecord[]>(
      `${this.invoiceServiceUrl}/invoices/by-business/${encodeURIComponent(businessId)}`,
      {
        headers: {
          'X-Tenant-Id': tenantId,
        },
      },
    );
  }

  private computeInvoiceSnapshot(
    invoices: InvoiceRecord[],
    business?: BusinessRecord | null,
    clients: ClientRecord[] = [],
  ) {
    const now = new Date();
    const clientMap = new Map(clients.map((client) => [client.id, client]));
    const paid = invoices.filter((invoice) => invoice.status === 'PAID');
    const overdue = invoices.filter(
      (invoice) =>
        invoice.status === 'OVERDUE' ||
        (invoice.status !== 'PAID' &&
          invoice.status !== 'CANCELED' &&
          new Date(invoice.dueDate).getTime() < now.getTime()),
    );
    const unpaid = invoices.filter(
      (invoice) => invoice.status === 'SENT' || invoice.status === 'OVERDUE' || invoice.status === 'DRAFT',
    );
    const totalUnpaid = unpaid.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    const latestInvoice = [...invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

    const followUps = overdue
      .map((invoice) => {
        const dueDate = new Date(invoice.dueDate);
        const diffDays = Math.max(
          1,
          Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
        );
        const client = clientMap.get(invoice.clientId);
        return {
          invoiceNumber: invoice.invoiceNumber,
          clientName: client?.name || 'Client inconnu',
          amount: Number(invoice.totalAmount || 0),
          overdueDays: diffDays,
        };
      })
      .sort((a, b) => b.overdueDays - a.overdueDays || b.amount - a.amount)
      .slice(0, 3);

    return {
      businessName: business?.name || 'votre activité',
      currency: business?.currency || 'TND',
      totalInvoices: invoices.length,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      overdueCount: overdue.length,
      totalUnpaid,
      latestInvoice,
      followUps,
      missingClientCount: Math.max(0, clients.length === 0 ? 1 : 0),
    };
  }

  private buildFallbackResponse(question: PredefinedQuestion): QuestionResponse {
    return {
      content:
        question.staticResponse ||
        "Je n'ai pas encore assez de contexte pour répondre automatiquement à cette question. Vous pouvez envoyer un message libre pour détailler le besoin.",
      metadata: {
        suggestedQuestionCodes: ['support-contact'],
      },
    };
  }

  private async buildQuestionResponse(
    question: PredefinedQuestion,
    businessId: string,
    user: ChatUserContext,
  ): Promise<QuestionResponse> {
    if (question.responseType === PredefinedQuestionResponseType.STATIC) {
      return this.buildFallbackResponse(question);
    }

    const tenantId = this.resolveTenantId(user);
    const [business, clients, invoices] = await Promise.all([
      this.getBusinessRecord(businessId),
      this.getClientsForBusiness(businessId),
      this.getInvoicesForBusiness(businessId, tenantId),
    ]);

    if (!invoices) {
      return {
        content:
          "Je n'ai pas pu joindre le service de facturation pour calculer cette réponse. Réessayez dans un instant ou utilisez le chat support si le blocage persiste.",
        metadata: {
          suggestedQuestionCodes: ['support-contact'],
          unavailableService: 'invoice-service',
        },
      };
    }

    const snapshot = this.computeInvoiceSnapshot(invoices, business, clients);

    switch (question.code) {
      case 'critical-actions-today': {
        const actions: string[] = [];
        if (snapshot.overdueCount > 0) {
          actions.push(
            `${snapshot.overdueCount} facture(s) sont en retard pour ${this.summarizeMoney(snapshot.totalUnpaid, snapshot.currency)}.`,
          );
        }
        if (snapshot.totalInvoices === 0) {
          actions.push("Aucune facture n'a encore été créée pour ce business.");
        }
        if (clients.length === 0) {
          actions.push("Aucun client n'est enregistré, ce qui bloque la création de nouvelles factures.");
        }
        if (actions.length === 0) {
          actions.push(
            `Aucun point critique détecté pour ${snapshot.businessName}. Les factures en cours sont sous contrôle.`,
          );
        }
        return {
          content: actions.join('\n'),
          metadata: {
            suggestedQuestionCodes:
              snapshot.overdueCount > 0
                ? ['unpaid-invoices', 'client-follow-up']
                : ['recommended-next-steps', 'latest-invoice-status'],
          },
        };
      }
      case 'invoice-overview': {
        return {
          content:
            `Résumé pour ${snapshot.businessName} : ${snapshot.totalInvoices} facture(s) au total, ` +
            `${snapshot.paidCount} payée(s), ${snapshot.unpaidCount} non réglée(s) et ` +
            `${snapshot.overdueCount} en retard. Montant encore ouvert: ` +
            `${this.summarizeMoney(snapshot.totalUnpaid, snapshot.currency)}.`,
          metadata: {
            suggestedQuestionCodes: ['unpaid-invoices', 'latest-invoice-status'],
          },
        };
      }
      case 'unpaid-invoices': {
        if (snapshot.unpaidCount === 0) {
          return {
            content: `Aucune facture impayée pour ${snapshot.businessName}. Tout est à jour.`,
            metadata: {
              suggestedQuestionCodes: ['invoice-overview', 'recommended-next-steps'],
            },
          };
        }
        return {
          content:
            `${snapshot.unpaidCount} facture(s) restent ouvertes pour un montant total de ` +
            `${this.summarizeMoney(snapshot.totalUnpaid, snapshot.currency)}. ` +
            `${snapshot.overdueCount} sont déjà en retard.`,
          metadata: {
            suggestedQuestionCodes: ['client-follow-up', 'critical-actions-today'],
          },
        };
      }
      case 'latest-invoice-status': {
        if (!snapshot.latestInvoice) {
          return {
            content:
              "Aucune facture n'est encore disponible. Vous pouvez commencer par créer un client puis une première facture.",
            metadata: {
              suggestedQuestionCodes: ['recommended-next-steps'],
            },
          };
        }
        const latestClient = clients.find(
          (client) => client.id === snapshot.latestInvoice?.clientId,
        );
        return {
          content:
            `La dernière facture est ${snapshot.latestInvoice.invoiceNumber}, ` +
            `statut ${snapshot.latestInvoice.status}, échéance le ` +
            `${new Date(snapshot.latestInvoice.dueDate).toLocaleDateString('fr-FR')}, ` +
            `montant ${this.summarizeMoney(snapshot.latestInvoice.totalAmount, snapshot.currency)}` +
            `${latestClient?.name ? ` pour ${latestClient.name}` : ''}.`,
          metadata: {
            suggestedQuestionCodes: ['invoice-overview', 'unpaid-invoices'],
          },
        };
      }
      case 'client-follow-up': {
        if (snapshot.followUps.length === 0) {
          return {
            content:
              'Aucun client prioritaire à relancer pour le moment. Les retards critiques sont sous contrôle.',
            metadata: {
              suggestedQuestionCodes: ['invoice-overview', 'recommended-next-steps'],
            },
          };
        }
        const lines = snapshot.followUps.map(
          (item, index) =>
            `${index + 1}. ${item.clientName}: facture ${item.invoiceNumber}, ` +
            `${this.summarizeMoney(item.amount, snapshot.currency)}, ${item.overdueDays} jour(s) de retard.`,
        );
        return {
          content: `Clients à suivre en priorité:\n${lines.join('\n')}`,
          metadata: {
            suggestedQuestionCodes: ['unpaid-invoices', 'support-contact'],
          },
        };
      }
      case 'recommended-next-steps': {
        const recommendations: string[] = [];
        if (snapshot.overdueCount > 0) {
          recommendations.push('Relancer immédiatement les factures en retard les plus anciennes.');
        }
        if (snapshot.totalInvoices === 0) {
          recommendations.push('Créer une première facture pour démarrer le suivi financier.');
        }
        if (clients.length === 0) {
          recommendations.push('Ajouter des clients pour fluidifier la facturation et le suivi commercial.');
        }
        if (recommendations.length === 0) {
          recommendations.push('Surveiller la prochaine échéance et maintenir le rythme de suivi actuel.');
        }
        return {
          content: `Actions recommandées:\n${recommendations.map((item) => `- ${item}`).join('\n')}`,
          metadata: {
            suggestedQuestionCodes: ['critical-actions-today', 'latest-invoice-status'],
          },
        };
      }
      case 'team-priority-summary': {
        const priorities: string[] = [];
        if (snapshot.overdueCount > 0) {
          priorities.push(`Traiter les ${snapshot.overdueCount} retards de paiement avant la fin de journée.`);
        }
        if (snapshot.unpaidCount > 0) {
          priorities.push('Mettre à jour les propriétaires des dossiers avec les relances en attente.');
        }
        if (snapshot.totalInvoices === 0) {
          priorities.push('Préparer le pipeline de facturation pour éviter une journée sans émission.');
        }
        if (priorities.length === 0) {
          priorities.push('Aucun signal bloquant détecté: maintenir le suivi courant et surveiller les nouveaux messages.');
        }
        return {
          content: `Priorités équipe:\n${priorities.map((item) => `- ${item}`).join('\n')}`,
          metadata: {
            suggestedQuestionCodes: ['critical-actions-today', 'invoice-overview'],
          },
        };
      }
      default:
        return this.buildFallbackResponse(question);
    }
  }

  // ─── TEAM CHAT ───

  async getOrCreateTeamRoom(businessId: string) {
    let room = await this.prisma.chatRoom.findUnique({
      where: { type_businessId: { type: ChatRoomType.BUSINESS_TEAM, businessId } },
    });
    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: {
          type: ChatRoomType.BUSINESS_TEAM,
          businessId,
          name: 'Team Chat',
        },
      });
      this.logger.log(`Created team room for business ${businessId}`);
    }
    return room;
  }

  async getTeamMessages(businessId: string, limit = 100, before?: string) {
    const room = await this.getOrCreateTeamRoom(businessId);
    const where: Record<string, unknown> = { roomId: room.id };

    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    return this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async sendTeamMessage(
    businessId: string,
    senderId: string,
    senderName: string,
    senderRole: string,
    content: string,
  ) {
    if (!content?.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    const room = await this.getOrCreateTeamRoom(businessId);
    const message = await this.createRoomMessage({
      roomId: room.id,
      senderId,
      senderName,
      senderRole,
      content,
      kind: ChatMessageKind.FREE_TEXT,
    });

    this.logger.log(`Team message from ${senderName} in business ${businessId}`);
    return message;
  }

  async listTeamQuestions(user: ChatUserContext) {
    await this.ensureQuestionCatalog();
    const roles = this.resolveUserRoles(user);

    const questions = await this.prisma.predefinedQuestion.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
    });

    return questions.filter((question) =>
      question.allowedRoles.some((allowedRole) =>
        roles.includes(this.normalizeRole(allowedRole)),
      ),
    );
  }

  async askTeamQuestion(businessId: string, questionCode: string, user: ChatUserContext) {
    await this.ensureQuestionCatalog();

    const question = await this.prisma.predefinedQuestion.findUnique({
      where: { code: questionCode },
    });

    if (!question || !question.active) {
      throw new NotFoundException('Question not found');
    }

    const roles = this.resolveUserRoles(user);
    const allowed = question.allowedRoles.some((role) =>
      roles.includes(this.normalizeRole(role)),
    );

    if (!allowed) {
      throw new ForbiddenException('You are not allowed to use this question');
    }

    const room = await this.getOrCreateTeamRoom(businessId);
    const senderName = this.resolveUserName(user);
    const senderRole = this.resolvePrimaryRole(user);
    const response = await this.buildQuestionResponse(question, businessId, user);

    const questionMessage = await this.createRoomMessage({
      roomId: room.id,
      senderId: user.sub,
      senderName,
      senderRole,
      content: question.label,
      kind: ChatMessageKind.PREDEFINED_QUESTION,
      questionCode: question.code,
      metadata: {
        category: question.category,
        responseType: question.responseType,
      },
    });

    const responseMessage = await this.createRoomMessage({
      roomId: room.id,
      senderId: SYSTEM_USER_ID,
      senderName: 'TaskFlow Assistant',
      senderRole: 'SYSTEM',
      content: response.content,
      kind: ChatMessageKind.AUTOMATED_RESPONSE,
      questionCode: question.code,
      metadata: {
        category: question.category,
        sourceQuestionLabel: question.label,
        ...response.metadata,
      },
    });

    return {
      question,
      messages: [questionMessage, responseMessage],
    };
  }

  // ─── SUPPORT CHAT ───

  async getOrCreateSupportRoom(businessId: string, ownerId: string) {
    let room = await this.prisma.chatRoom.findUnique({
      where: { type_businessId: { type: ChatRoomType.SUPPORT, businessId } },
    });
    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: {
          type: ChatRoomType.SUPPORT,
          businessId,
          ownerId,
          name: 'Support',
        },
      });
      this.logger.log(`Created support room for business ${businessId}`);
    }
    return room;
  }

  async getSupportMessages(roomId: string, limit = 100, before?: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Support room not found');

    const where: Record<string, unknown> = { roomId: room.id };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    return this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async sendSupportMessage(
    roomId: string,
    senderId: string,
    senderName: string,
    senderRole: string,
    content: string,
  ) {
    if (!content?.trim()) throw new BadRequestException('Message cannot be empty');

    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Support room not found');

    const message = await this.createRoomMessage({
      roomId: room.id,
      senderId,
      senderName,
      senderRole,
      content,
      kind: ChatMessageKind.FREE_TEXT,
    });

    this.logger.log(`Support message from ${senderName} (${senderRole}) in room ${roomId}`);
    return message;
  }

  async listSupportRooms() {
    return this.prisma.chatRoom.findMany({
      where: { type: ChatRoomType.SUPPORT },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSupportRoomByBusiness(businessId: string) {
    return this.prisma.chatRoom.findUnique({
      where: { type_businessId: { type: ChatRoomType.SUPPORT, businessId } },
    });
  }

  async markAsRead(roomId: string, readerId: string) {
    return this.prisma.chatMessage.updateMany({
      where: {
        roomId,
        senderId: { not: readerId },
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async countUnread(roomId: string, userId: string) {
    return this.prisma.chatMessage.count({
      where: {
        roomId,
        senderId: { not: userId },
        isRead: false,
      },
    });
  }
}
