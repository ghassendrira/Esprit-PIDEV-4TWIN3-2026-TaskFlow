ALTER TABLE "Invoice"
ADD COLUMN "lastReminderSentAt" TIMESTAMP(3),
ADD COLUMN "nextReminderDueAt" TIMESTAMP(3),
ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reminderProcessingStartedAt" TIMESTAMP(3);

CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");
CREATE INDEX "Invoice_nextReminderDueAt_idx" ON "Invoice"("nextReminderDueAt");
CREATE INDEX "Invoice_reminderProcessingStartedAt_idx" ON "Invoice"("reminderProcessingStartedAt");
