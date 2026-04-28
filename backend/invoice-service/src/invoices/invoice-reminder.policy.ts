import { InvoiceStatus } from '@prisma/client';

export type ReminderSeverity = 'CRITIQUE' | 'URGENT' | 'ATTENTION' | 'NORMALE';

export type ReminderInvoiceSnapshot = {
  status: InvoiceStatus;
  dueDate: Date;
  lastReminderSentAt: Date | null;
  nextReminderDueAt?: Date | null;
  deletedAt?: Date | null;
};

export type ReminderDecision =
  | {
      eligible: true;
      severity: ReminderSeverity;
      nextAllowedAt: Date;
      reason: 'first-reminder-overdue' | 'reminder-due';
    }
  | {
      eligible: false;
      severity?: ReminderSeverity;
      nextAllowedAt?: Date;
      reason:
        | 'deleted'
        | 'status-not-eligible'
        | 'invoice-not-overdue-yet'
        | 'reminder-too-recent';
    };

export const AUTOMATIC_REMINDER_STATUSES: InvoiceStatus[] = ['SENT', 'OVERDUE'];

export function getReminderDelayDays(severity: ReminderSeverity): number {
  switch (severity) {
    case 'CRITIQUE':
      return 3;
    case 'URGENT':
      return 4;
    case 'ATTENTION':
      return 5;
    case 'NORMALE':
    default:
      return 6;
  }
}

export function deriveReminderSeverity(
  dueDateInput: Date,
  nowInput: Date = new Date(),
): ReminderSeverity {
  const dueDate = new Date(dueDateInput);
  const now = new Date(nowInput);
  const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 30) return 'CRITIQUE';
  if (diffDays > 0) return 'URGENT';
  if (diffDays >= -7) return 'ATTENTION';
  return 'NORMALE';
}

export function computeNextReminderDueAt(
  baseDateInput: Date,
  severity: ReminderSeverity,
): Date {
  const baseDate = new Date(baseDateInput);
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + getReminderDelayDays(severity));
  return nextDate;
}

export function evaluateReminderEligibility(
  invoice: ReminderInvoiceSnapshot,
  nowInput: Date = new Date(),
): ReminderDecision {
  const now = new Date(nowInput);

  if (invoice.deletedAt) {
    return { eligible: false, reason: 'deleted' };
  }

  if (!AUTOMATIC_REMINDER_STATUSES.includes(invoice.status)) {
    return { eligible: false, reason: 'status-not-eligible' };
  }

  const dueDate = new Date(invoice.dueDate);
  const severity = deriveReminderSeverity(dueDate, now);

  if (!invoice.lastReminderSentAt) {
    if (dueDate.getTime() > now.getTime()) {
      return { eligible: false, severity, reason: 'invoice-not-overdue-yet' };
    }

    return {
      eligible: true,
      severity,
      nextAllowedAt: now,
      reason: 'first-reminder-overdue',
    };
  }

  const nextAllowedAt = invoice.nextReminderDueAt
    ? new Date(invoice.nextReminderDueAt)
    : computeNextReminderDueAt(invoice.lastReminderSentAt, severity);

  if (nextAllowedAt.getTime() > now.getTime()) {
    return {
      eligible: false,
      severity,
      nextAllowedAt,
      reason: 'reminder-too-recent',
    };
  }

  return {
    eligible: true,
    severity,
    nextAllowedAt,
    reason: 'reminder-due',
  };
}
