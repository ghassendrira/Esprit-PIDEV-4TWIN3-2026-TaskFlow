import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';
import {
  AUTOMATIC_REMINDER_STATUSES,
  ReminderSeverity,
  computeNextReminderDueAt,
  deriveReminderSeverity,
  evaluateReminderEligibility,
  getReminderDelayDays,
} from './invoice-reminder.policy';

type InvoiceWithRelations = any;

type BusinessRecord = {
  id: string;
  tenantId: string;
  name?: string;
};

type ClientRecord = {
  id: string;
  email?: string;
  name?: string;
};

type SmartReminderOptions = {
  trigger?: 'manual' | 'scheduler';
  preloadedBusiness?: BusinessRecord | null;
  preloadedClient?: ClientRecord | null;
  updateReminderTracking?: boolean;
};

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly ollamaBaseUrl: string;
  private readonly ollamaModel: string;
  private reminderJobRunning = false;

  constructor(private prisma: PrismaService) {
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3';
    this.logger.log(
      `Ollama configured: ${this.ollamaBaseUrl} with model "${this.ollamaModel}"`,
    );
  }

  private validateUuid(id: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) throw new BadRequestException(`Invalid UUID: ${id}`);
  }

  private get businessServiceUrl() {
    return process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003';
  }

  private get notificationServiceUrl() {
    return process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
  }

  private async fetchBusiness(businessId: string): Promise<BusinessRecord | null> {
    try {
      const response = await fetch(
        `${this.businessServiceUrl}/businesses/${encodeURIComponent(businessId)}`,
      );
      if (!response.ok) return null;
      return (await response.json()) as BusinessRecord;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch business ${businessId}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  private async fetchClient(clientId: string): Promise<ClientRecord | null> {
    try {
      const response = await fetch(
        `${this.businessServiceUrl}/clients/${encodeURIComponent(clientId)}`,
      );
      if (!response.ok) return null;
      return (await response.json()) as ClientRecord;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch client ${clientId}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  private async verifyOwnership(
    id: string,
    tenantId: string,
    includeDeleted = false,
  ): Promise<InvoiceWithRelations | null> {
    try {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id,
          ...(includeDeleted ? {} : { deletedAt: null }),
        },
        include: {
          items: true,
          payments: true,
        },
      });

      if (!invoice) return null;

      const business = await this.fetchBusiness(invoice.businessId);
      if (!business) return null;

      if (
        String(business.tenantId).toLowerCase() !== String(tenantId).toLowerCase()
      ) {
        return null;
      }

      return invoice;
    } catch (error: any) {
      this.logger.error(
        `Error verifying ownership for invoice ${id}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  private async assertBusinessTenant(
    businessId: string,
    tenantId: string,
  ): Promise<BusinessRecord> {
    const business = await this.fetchBusiness(businessId);
    if (!business) {
      throw new BadRequestException('Business not found');
    }

    if (
      String(business.tenantId).toLowerCase() !== String(tenantId).toLowerCase()
    ) {
      throw new BadRequestException('Access denied for this business');
    }

    return business;
  }

  private computeItemsTotal(items: CreateInvoiceDto['items']) {
    if (!items || items.length === 0) return { items: [], total: 0 };

    const normalized = items.map((it) => {
      const quantity = Number(it.quantity ?? 0);
      const unitPrice = Number(it.unitPrice ?? 0);
      const amount = Number.isFinite(it.amount as any)
        ? Number(it.amount)
        : quantity * unitPrice;
      return {
        description: String(it.description ?? '').trim(),
        quantity,
        unitPrice,
        amount,
      };
    });

    const total = normalized.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    return { items: normalized, total };
  }

  private buildSmartReminderPrompt(params: {
    businessName: string;
    clientName: string;
    invoiceNumber: string;
    totalAmount: number;
    issueDate: Date;
    dueDate: Date;
    severity: ReminderSeverity;
    statusLabel: string;
    notes?: string;
  }) {
    const toneInstructions: Record<ReminderSeverity, string> = {
      NORMALE:
        'Write a friendly, informative reminder email. The tone should be warm and professional.',
      ATTENTION:
        'Write a polite reminder email. The tone should be professional, clear, and gently urgent.',
      URGENT:
        'Write a firm but respectful reminder email. The tone should be professional and urgent.',
      CRITIQUE:
        'Write a formal collection reminder email. The tone should be serious, direct, and urgent.',
    };

    return `You are an AI assistant for the business "${params.businessName}" using TaskFlow invoicing platform.

Generate a personalized email body (plain text, NO subject line, NO greetings like "Subject:" or "Dear") for the following invoice reminder:

Client name: ${params.clientName}
Invoice number: ${params.invoiceNumber}
Total amount: ${params.totalAmount.toFixed(2)} TND
Issue date: ${params.issueDate.toLocaleDateString('en-US')}
Due date: ${params.dueDate.toLocaleDateString('en-US')}
Severity: ${params.statusLabel}
${params.notes ? `Notes: ${params.notes}` : ''}

TONE INSTRUCTIONS: ${toneInstructions[params.severity]}

RULES:
- Start with "Dear ${params.clientName},"
- Mention that this is a payment reminder.
- Include the invoice number, amount (in TND), and due date in the body.
- End with a professional closing signed by "${params.businessName}".
- Keep it concise (max 10 lines).
- Plain text only, no markdown, no HTML, no asterisks.
- Do NOT include a subject line.`;
  }

  private async generateSmartReminderBody(params: {
    businessName: string;
    clientName: string;
    invoiceNumber: string;
    totalAmount: number;
    issueDate: Date;
    dueDate: Date;
    severity: ReminderSeverity;
    statusLabel: string;
    notes?: string;
  }) {
    const prompt = this.buildSmartReminderPrompt(params);

    try {
      const ollamaResponse = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages: [
            {
              role: 'system',
              content:
                'You are a professional business email writer. Write concise, clear plain-text emails. Never use markdown formatting or asterisks.',
            },
            { role: 'user', content: prompt },
          ],
          stream: false,
          options: { temperature: 0.4, num_predict: 500 },
        }),
      });

      if (!ollamaResponse.ok) {
        const errText = await ollamaResponse.text();
        this.logger.error(
          `Ollama returned HTTP ${ollamaResponse.status}: ${errText}`,
        );
        if (ollamaResponse.status === 404) {
          throw new BadRequestException(
            `Ollama model "${this.ollamaModel}" not found. Run: ollama pull ${this.ollamaModel}`,
          );
        }
        throw new BadRequestException(`Ollama error: ${errText}`);
      }

      const result = (await ollamaResponse.json()) as {
        message?: { content?: string };
      };
      const emailBody = (result?.message?.content || '').replace(/\*+/g, '').trim();
      if (!emailBody) {
        throw new Error('Empty response from Ollama');
      }

      return emailBody;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;

      const isConnectionError =
        error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED';
      if (isConnectionError) {
        throw new BadRequestException('Ollama is not running. Start it with: ollama serve');
      }

      throw new BadRequestException(`AI email generation failed: ${error.message}`);
    }
  }

  private async generateInvoicePdfBase64(
    invoice: InvoiceWithRelations,
    businessName: string,
    clientName: string,
    clientEmail: string,
  ) {
    const dueDate = new Date(invoice.dueDate);
    const subtotal = invoice.totalAmount - invoice.taxAmount;

    try {
      const pdfResponse = await fetch(`${this.notificationServiceUrl}/pdf/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          issueDate: new Date(invoice.issueDate).toLocaleDateString('fr-FR'),
          dueDate: dueDate.toLocaleDateString('fr-FR'),
          businessName,
          businessAddress: '',
          businessPhone: '',
          clientName,
          clientEmail,
          clientAddress: '',
          items: (invoice.items || []).map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            amount: it.amount,
          })),
          subtotal,
          taxRate: 0,
          taxAmount: invoice.taxAmount,
          totalAmount: invoice.totalAmount,
          notes: invoice.notes,
          status:
            invoice.status === 'PAID'
              ? 'PAID'
              : invoice.status === 'OVERDUE'
                ? 'OVERDUE'
                : 'PENDING',
          currency: 'TND',
        }),
      });

      if (!pdfResponse.ok) {
        throw new Error(`PDF service returned ${pdfResponse.status}`);
      }

      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
      this.logger.log(
        `Invoice PDF generated successfully for ${invoice.invoiceNumber} (${pdfBuffer.length} bytes)`,
      );
      return pdfBuffer.toString('base64');
    } catch (error: any) {
      throw new BadRequestException(`PDF generation failed: ${error.message}`);
    }
  }

  private getSeverityLabel(severity: ReminderSeverity, dueDate: Date, now: Date) {
    const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (severity) {
      case 'CRITIQUE':
        return `CRITIQUE — ${Math.max(diffDays, 0)} days overdue`;
      case 'URGENT':
        return `URGENT — ${Math.max(diffDays, 0)} days overdue`;
      case 'ATTENTION':
        return diffDays >= 0
          ? `ATTENTION — due today`
          : `ATTENTION — due in ${Math.abs(diffDays)} days`;
      case 'NORMALE':
      default:
        return `NORMALE — standard reminder cadence (${getReminderDelayDays('NORMALE')} days)`;
    }
  }

  private async sendSmartReminder(
    invoice: InvoiceWithRelations,
    tenantId: string,
    options: SmartReminderOptions = {},
  ) {
    const trigger = options.trigger ?? 'manual';
    const updateReminderTracking = options.updateReminderTracking ?? true;
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    const severity = deriveReminderSeverity(dueDate, now);
    const statusLabel = this.getSeverityLabel(severity, dueDate, now);

    const business =
      options.preloadedBusiness ?? (await this.fetchBusiness(invoice.businessId));
    if (!business) {
      throw new BadRequestException('Business not found for invoice reminder');
    }

    if (String(business.tenantId).toLowerCase() !== String(tenantId).toLowerCase()) {
      throw new BadRequestException('Access denied for this business');
    }

    const client = options.preloadedClient ?? (await this.fetchClient(invoice.clientId));
    const clientEmail = (client?.email || '').trim();
    const clientName = client?.name?.trim() || 'Client';

    if (!clientEmail) {
      throw new BadRequestException('Client email is required to send a reminder');
    }

    this.logger.log(
      `[${trigger}] Preparing smart reminder for invoice ${invoice.invoiceNumber} ` +
        `(severity=${severity}, reminderCount=${invoice.reminderCount})`,
    );

    const emailBody = await this.generateSmartReminderBody({
      businessName: business.name || 'Your Business',
      clientName,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      issueDate: new Date(invoice.issueDate),
      dueDate,
      severity,
      statusLabel,
      notes: invoice.notes,
    });

    const pdfBase64 = await this.generateInvoicePdfBase64(
      invoice,
      business.name || 'Your Business',
      clientName,
      clientEmail,
    );

    const subjectMap: Record<ReminderSeverity, string> = {
      NORMALE: `Invoice ${invoice.invoiceNumber} from ${business.name || 'TaskFlow'}`,
      ATTENTION: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
      URGENT: `Urgent Payment Reminder: Invoice ${invoice.invoiceNumber}`,
      CRITIQUE: `Critical Payment Reminder: Invoice ${invoice.invoiceNumber}`,
    };

    try {
      const emailResponse = await fetch(
        `${this.notificationServiceUrl}/notification/smart-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: clientEmail,
            clientName,
            subject: subjectMap[severity],
            textBody: emailBody,
            pdfBase64,
            invoiceNumber: invoice.invoiceNumber,
          }),
        },
      );

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        throw new Error(
          `Notification service returned ${emailResponse.status}: ${errorText}`,
        );
      }

      if (updateReminderTracking) {
        const reminderSentAt = new Date();
        const nextReminderDueAt = computeNextReminderDueAt(reminderSentAt, severity);
        const nextStatus =
          invoice.status === 'DRAFT'
            ? 'SENT'
            : invoice.status === 'SENT' && dueDate.getTime() < reminderSentAt.getTime()
              ? 'OVERDUE'
              : invoice.status;

        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: nextStatus,
            lastReminderSentAt: reminderSentAt,
            nextReminderDueAt,
            reminderProcessingStartedAt: null,
            reminderCount: { increment: 1 },
          } as any,
        });
      }

      return {
        success: true,
        trigger,
        severity,
        statusLabel,
        invoiceNumber: invoice.invoiceNumber,
        recipient: clientEmail,
        aiGenerated: true,
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to send smart email: ${error.message}`);
    }
  }

  private async releaseReminderLock(invoiceId: string) {
    await this.prisma.invoice.updateMany({
      where: { id: invoiceId },
      data: { reminderProcessingStartedAt: null } as any,
    });
  }

  private async claimReminderLock(invoiceId: string, staleLockBefore: Date) {
    const result = await this.prisma.invoice.updateMany({
      where: {
        id: invoiceId,
        OR: [
          { reminderProcessingStartedAt: null },
          { reminderProcessingStartedAt: { lt: staleLockBefore } },
        ],
      } as any,
      data: { reminderProcessingStartedAt: new Date() } as any,
    });

    return result.count === 1;
  }

  async findOne(id: string, tenantId: string) {
    this.validateUuid(id);

    const invoice = await this.verifyOwnership(id, tenantId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    return invoice;
  }

  async listByBusiness(businessId: string, tenantId: string) {
    this.validateUuid(businessId);
    await this.assertBusinessTenant(businessId, tenantId);

    return this.prisma.invoice.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payments: true },
    });
  }

  async create(dto: CreateInvoiceDto, tenantId: string) {
    if (!dto.businessId) throw new BadRequestException('businessId is required');
    if (!dto.clientId) throw new BadRequestException('clientId is required');

    await this.assertBusinessTenant(dto.businessId, tenantId);

    const invoiceNumber = (dto.invoiceNumber?.trim() || `INV-${Date.now()}`).slice(0, 64);
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : issueDate;

    const { items, total } = this.computeItemsTotal(dto.items);
    const taxAmount = Number.isFinite(dto.taxAmount as any) ? Number(dto.taxAmount) : 0;
    const totalAmount = total + taxAmount;

    return this.prisma.invoice.create({
      data: {
        businessId: dto.businessId,
        clientId: dto.clientId,
        createdBy: dto.createdBy ?? undefined,
        invoiceNumber,
        status: dto.status ?? 'DRAFT',
        issueDate,
        dueDate,
        totalAmount,
        taxAmount,
        pdfUrl: dto.pdfUrl ?? '',
        notes: dto.notes ?? '',
        items: items.length
          ? {
              create: items.map((it) => ({
                description: it.description,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                amount: it.amount,
              })),
            }
          : undefined,
      },
      include: { items: true, payments: true },
    });
  }

  async update(id: string, dto: UpdateInvoiceDto, tenantId: string) {
    const invoice = await this.verifyOwnership(id, tenantId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const issueDate = dto.issueDate ? new Date(dto.issueDate) : undefined;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;

    const { items, total } = this.computeItemsTotal(dto.items);

    let totalAmount = invoice.totalAmount;
    let taxAmount =
      dto.taxAmount !== undefined ? Number(dto.taxAmount) : invoice.taxAmount;

    if (dto.items) {
      totalAmount = total + taxAmount;
    } else if (dto.taxAmount !== undefined) {
      const existingSubtotal = invoice.totalAmount - invoice.taxAmount;
      totalAmount = existingSubtotal + taxAmount;
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.businessId ? { businessId: dto.businessId } : {}),
        ...(dto.clientId ? { clientId: dto.clientId } : {}),
        ...(dto.createdBy ? { createdBy: dto.createdBy } : {}),
        ...(dto.invoiceNumber !== undefined
          ? { invoiceNumber: dto.invoiceNumber || invoice.invoiceNumber }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(issueDate ? { issueDate } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(dto.taxAmount !== undefined ? { taxAmount } : {}),
        ...(dto.items
          ? { totalAmount }
          : dto.taxAmount !== undefined
            ? { totalAmount }
            : {}),
        ...(dto.pdfUrl !== undefined ? { pdfUrl: dto.pdfUrl ?? '' } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? '' } : {}),
        ...(dto.items
          ? {
              items: {
                deleteMany: { invoiceId: id },
                create: items.map((it) => ({
                  description: it.description,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                  amount: it.amount,
                })),
              },
            }
          : {}),
      },
      include: { items: true, payments: true },
    });
  }

  async remove(id: string, tenantId: string) {
    const invoice = await this.verifyOwnership(id, tenantId, true);
    if (!invoice) throw new NotFoundException('Invoice not found');

    await this.prisma.invoice.delete({
      where: { id },
    });

    return { success: true };
  }

  async send(id: string, tenantId: string) {
    this.validateUuid(id);
    const invoice = await this.verifyOwnership(id, tenantId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const client = await this.fetchClient(invoice.clientId);
    const business = await this.fetchBusiness(invoice.businessId);

    const clientEmail = client?.email || 'client@example.com';
    const clientName = client?.name || 'Client';
    const businessName = business?.name || 'Votre Entreprise';
    const subtotal = invoice.totalAmount - invoice.taxAmount;

    try {
      const notifResponse = await fetch(
        `${this.notificationServiceUrl}/notification/invoice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: clientEmail,
            clientName,
            businessName,
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            items: (invoice.items || []).map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              amount: it.amount,
            })),
            subtotal,
            taxAmount: invoice.taxAmount,
            totalAmount: invoice.totalAmount,
            notes: invoice.notes,
          }),
        },
      );

      if (!notifResponse.ok) {
        const errorText = await notifResponse.text();
        throw new Error(
          `Notification service returned ${notifResponse.status}: ${errorText}`,
        );
      }

      await this.prisma.invoice.update({
        where: { id },
        data: { status: 'SENT' },
      });

      return { success: true };
    } catch (error: any) {
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  async sendSmartEmail(
    id: string,
    tenantId: string,
    options: SmartReminderOptions = {},
  ) {
    this.validateUuid(id);
    const invoice = await this.verifyOwnership(id, tenantId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.sendSmartReminder(invoice, tenantId, options);
  }

  async processAutomaticReminders(trigger: 'startup' | 'interval' = 'interval') {
    if (this.reminderJobRunning) {
      this.logger.warn(
        `Automatic reminder job skipped (${trigger}) because a previous execution is still running.`,
      );
      return { skipped: true };
    }

    this.reminderJobRunning = true;
    const startedAt = new Date();
    const staleLockBefore = new Date(startedAt.getTime() - 30 * 60 * 1000);

    try {
      this.logger.log(`Automatic reminder job started (${trigger}) at ${startedAt.toISOString()}`);

      const candidates = await this.prisma.invoice.findMany({
        where: {
          deletedAt: null,
          status: { in: AUTOMATIC_REMINDER_STATUSES },
          AND: [
            {
              OR: [
                { nextReminderDueAt: { lte: startedAt } },
                { lastReminderSentAt: null, dueDate: { lte: startedAt } },
              ],
            },
            {
              OR: [
                { reminderProcessingStartedAt: null },
                { reminderProcessingStartedAt: { lt: staleLockBefore } },
              ],
            },
          ],
        } as any,
        orderBy: [{ nextReminderDueAt: 'asc' }, { dueDate: 'asc' }] as any,
        include: { items: true, payments: true },
      });

      this.logger.log(
        `Automatic reminder job scanned ${candidates.length} candidate invoice(s).`,
      );

      let eligibleCount = 0;
      let sentCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const invoice of candidates) {
        const claimed = await this.claimReminderLock(invoice.id, staleLockBefore);
        if (!claimed) {
          skippedCount += 1;
          this.logger.warn(
            `Invoice ${invoice.invoiceNumber} skipped because another execution already claimed it.`,
          );
          continue;
        }

        try {
          const decision = evaluateReminderEligibility({
            status: invoice.status,
            dueDate: invoice.dueDate,
            lastReminderSentAt: invoice.lastReminderSentAt,
            nextReminderDueAt: invoice.nextReminderDueAt,
            deletedAt: invoice.deletedAt,
          }, startedAt);

          if (!decision.eligible) {
            skippedCount += 1;
            this.logger.log(
              `Invoice ${invoice.invoiceNumber} ignored: ${decision.reason}.`,
            );
            await this.releaseReminderLock(invoice.id);
            continue;
          }

          eligibleCount += 1;

          const business = await this.fetchBusiness(invoice.businessId);
          if (!business?.tenantId) {
            skippedCount += 1;
            this.logger.warn(
              `Invoice ${invoice.invoiceNumber} ignored: unable to resolve tenant/business context.`,
            );
            await this.releaseReminderLock(invoice.id);
            continue;
          }

          const client = await this.fetchClient(invoice.clientId);
          if (!client?.email) {
            skippedCount += 1;
            this.logger.warn(
              `Invoice ${invoice.invoiceNumber} ignored: missing client email.`,
            );
            await this.releaseReminderLock(invoice.id);
            continue;
          }

          this.logger.log(
            `Invoice ${invoice.invoiceNumber} is eligible for automatic reminder ` +
              `(severity=${decision.severity}, reason=${decision.reason}).`,
          );

          await this.sendSmartReminder(invoice, business.tenantId, {
            trigger: 'scheduler',
            preloadedBusiness: business,
            preloadedClient: client,
            updateReminderTracking: true,
          });

          sentCount += 1;
          this.logger.log(
            `Automatic reminder sent successfully for invoice ${invoice.invoiceNumber}.`,
          );
        } catch (error: any) {
          errorCount += 1;
          this.logger.error(
            `Automatic reminder failed for invoice ${invoice.invoiceNumber}: ${error.message}`,
            error.stack,
          );
          await this.releaseReminderLock(invoice.id);
        }
      }

      this.logger.log(
        `Automatic reminder job finished. scanned=${candidates.length}, eligible=${eligibleCount}, sent=${sentCount}, skipped=${skippedCount}, errors=${errorCount}`,
      );

      return {
        scanned: candidates.length,
        eligible: eligibleCount,
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount,
      };
    } finally {
      this.reminderJobRunning = false;
    }
  }

  async generateUnpaidReport(businessId: string, tenantId: string) {
    this.validateUuid(businessId);
    const business = await this.assertBusinessTenant(businessId, tenantId);

    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: { in: ['SENT', 'OVERDUE', 'DRAFT'] },
      },
      orderBy: { dueDate: 'asc' },
      include: { items: true },
    });

    if (unpaidInvoices.length === 0) {
      return {
        report:
          'No unpaid invoices found for this business. All clients are up to date.',
      };
    }

    const clientIds = [...new Set(unpaidInvoices.map((inv) => inv.clientId))];
    const clientsMap: Record<string, { name: string; email: string }> = {};
    for (const clientId of clientIds) {
      const client = await this.fetchClient(clientId);
      if (client) {
        clientsMap[clientId] = {
          name: client.name || 'Unknown',
          email: client.email || '',
        };
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const invoiceData = unpaidInvoices.map((inv) => {
      const client = clientsMap[inv.clientId] || {
        name: 'Unknown client',
        email: '',
      };
      const dueDate = new Date(inv.dueDate);
      const diffDays = Math.ceil(
        (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      return {
        invoiceNumber: inv.invoiceNumber,
        clientName: client.name,
        clientEmail: client.email,
        status: inv.status,
        totalAmount: inv.totalAmount,
        issueDate: new Date(inv.issueDate).toISOString().slice(0, 10),
        dueDate: dueDate.toISOString().slice(0, 10),
        daysUntilDue: diffDays,
        isOverdue: diffDays < 0,
      };
    });

    const prompt = `You are an expert financial analyst. Today is ${today}.

Below is the list of unpaid invoices for the business "${business.name}", sorted by urgency (earliest due date first):

${JSON.stringify(invoiceData, null, 2)}

Generate a formal, professional report in English with the following sections:

1. EXECUTIVE SUMMARY: total number of unpaid invoices, total amount due, number of overdue invoices.
2. PRIORITY RANKING: list each client by urgency (most overdue first, then those closest to their due date).
3. For each client, include:
   - Client name and email
   - Invoice number(s)
   - Amount due
   - Due date and number of days overdue or remaining
   - Urgency level: use colored circle emojis: 🔴 CRITICAL if more than 30 days overdue, 🟠 URGENT if overdue less than 30 days, 🟡 ATTENTION if due within 7 days, 🟢 NORMAL otherwise
4. RECOMMENDATIONS: for each urgency level, start the line with its colored circle emoji followed by the level name, then provide concrete follow-up actions. Use this exact format:
   🔴 CRITICAL: ...actions...
   🟠 URGENT: ...actions...
   🟡 ATTENTION: ...actions...
   🟢 NORMAL: ...actions...

IMPORTANT FORMATTING RULES:
- Do NOT use markdown formatting. No asterisks, no bold, no headers with #.
- Use plain text only with clear section titles in UPPERCASE.
- Use numbered lists and dashes for sub-items.
- Use TND as the currency.
- Keep the tone formal and professional.`;

    try {
      const ollamaResponse = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert financial analyst specializing in invoice management and client follow-up for small and medium businesses. Always respond in plain text without any markdown formatting, asterisks, or special characters.',
            },
            { role: 'user', content: prompt },
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 2000,
          },
        }),
      });

      if (!ollamaResponse.ok) {
        const errText = await ollamaResponse.text();
        this.logger.error(
          `Ollama returned HTTP ${ollamaResponse.status}: ${errText}`,
        );
        if (ollamaResponse.status === 404) {
          throw new BadRequestException(
            `Ollama model "${this.ollamaModel}" not found. Run: ollama pull ${this.ollamaModel}`,
          );
        }
        throw new BadRequestException(
          `Ollama error (${ollamaResponse.status}): ${errText}`,
        );
      }

      const result = (await ollamaResponse.json()) as {
        message?: { content?: string };
      };
      const rawReport =
        result?.message?.content || 'Error: no response from the model.';
      const report = rawReport.replace(/\*+/g, '').replace(/^#+\s*/gm, '');
      this.logger.log(`Ollama report generated successfully (${report.length} chars)`);

      return {
        report,
        metadata: {
          totalUnpaid: unpaidInvoices.length,
          totalAmount: unpaidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
          overdueCount: invoiceData.filter((item) => item.isOverdue).length,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;

      const isConnectionError =
        error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED';
      if (isConnectionError) {
        this.logger.error(
          'Cannot connect to Ollama. Is it running? Start it with: ollama serve',
        );
        throw new BadRequestException(
          'Ollama is not running. Start it with: ollama serve',
        );
      }

      this.logger.error(`LLM call failed: ${error.message}`);
      throw new BadRequestException(`Error generating AI report: ${error.message}`);
    }
  }
}
