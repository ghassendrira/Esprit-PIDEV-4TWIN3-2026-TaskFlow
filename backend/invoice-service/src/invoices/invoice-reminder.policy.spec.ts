import {
  computeNextReminderDueAt,
  deriveReminderSeverity,
  evaluateReminderEligibility,
  getReminderDelayDays,
} from './invoice-reminder.policy';

describe('invoice reminder policy', () => {
  it('maps severities to the expected delay days', () => {
    expect(getReminderDelayDays('CRITIQUE')).toBe(3);
    expect(getReminderDelayDays('URGENT')).toBe(4);
    expect(getReminderDelayDays('ATTENTION')).toBe(5);
    expect(getReminderDelayDays('NORMALE')).toBe(6);
  });

  it('derives CRITIQUE severity for invoices overdue by more than 30 days', () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const dueDate = new Date('2026-02-20T10:00:00.000Z');

    expect(deriveReminderSeverity(dueDate, now)).toBe('CRITIQUE');
  });

  it('derives URGENT severity for overdue invoices under 30 days', () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const dueDate = new Date('2026-04-01T10:00:00.000Z');

    expect(deriveReminderSeverity(dueDate, now)).toBe('URGENT');
  });

  it('derives ATTENTION severity for invoices due within the next week', () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const dueDate = new Date('2026-04-12T10:00:00.000Z');

    expect(deriveReminderSeverity(dueDate, now)).toBe('ATTENTION');
  });

  it('allows a first reminder immediately when an unpaid invoice is overdue', () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const decision = evaluateReminderEligibility(
      {
        status: 'OVERDUE',
        dueDate: new Date('2026-04-01T10:00:00.000Z'),
        lastReminderSentAt: null,
      },
      now,
    );

    expect(decision).toEqual({
      eligible: true,
      severity: 'URGENT',
      nextAllowedAt: now,
      reason: 'first-reminder-overdue',
    });
  });

  it('rejects a first reminder when the invoice is not overdue yet', () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const decision = evaluateReminderEligibility(
      {
        status: 'SENT',
        dueDate: new Date('2026-04-15T10:00:00.000Z'),
        lastReminderSentAt: null,
      },
      now,
    );

    expect(decision.eligible).toBe(false);
    expect(decision.reason).toBe('invoice-not-overdue-yet');
  });

  it('rejects reminders that are still too recent', () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const lastReminderSentAt = new Date('2026-04-07T10:00:00.000Z');
    const decision = evaluateReminderEligibility(
      {
        status: 'OVERDUE',
        dueDate: new Date('2026-03-01T10:00:00.000Z'),
        lastReminderSentAt,
        nextReminderDueAt: computeNextReminderDueAt(lastReminderSentAt, 'CRITIQUE'),
      },
      now,
    );

    expect(decision.eligible).toBe(false);
    expect(decision.reason).toBe('reminder-too-recent');
  });

  it('allows reminders again once the waiting delay has passed', () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const lastReminderSentAt = new Date('2026-04-04T10:00:00.000Z');
    const decision = evaluateReminderEligibility(
      {
        status: 'OVERDUE',
        dueDate: new Date('2026-04-01T10:00:00.000Z'),
        lastReminderSentAt,
      },
      now,
    );

    expect(decision.eligible).toBe(true);
    expect(decision.reason).toBe('reminder-due');
    expect(decision.severity).toBe('URGENT');
  });

  it('never allows reminders for paid invoices', () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const decision = evaluateReminderEligibility(
      {
        status: 'PAID',
        dueDate: new Date('2026-03-01T10:00:00.000Z'),
        lastReminderSentAt: null,
      },
      now,
    );

    expect(decision.eligible).toBe(false);
    expect(decision.reason).toBe('status-not-eligible');
  });
});
