import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Injectable()
export class InvoiceReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceReminderScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly invoicesService: InvoicesService) {}

  onModuleInit() {
    const enabled = process.env.INVOICE_REMINDER_SCHEDULER_ENABLED !== 'false';
    if (!enabled) {
      this.logger.warn('Automatic invoice reminder scheduler is disabled by configuration.');
      return;
    }

    const intervalMs = Number(process.env.INVOICE_REMINDER_INTERVAL_MS ?? 60 * 60 * 1000);
    const startupDelayMs = Number(process.env.INVOICE_REMINDER_STARTUP_DELAY_MS ?? 15_000);

    this.logger.log(
      `Automatic invoice reminder scheduler enabled. Interval=${intervalMs}ms, startupDelay=${startupDelayMs}ms`,
    );

    setTimeout(() => {
      void this.invoicesService.processAutomaticReminders('startup');
    }, startupDelayMs);

    this.timer = setInterval(() => {
      void this.invoicesService.processAutomaticReminders('interval');
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
