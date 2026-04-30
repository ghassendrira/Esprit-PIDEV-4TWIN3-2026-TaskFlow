ALTER TABLE "Client"
ADD COLUMN "assignedUserId" UUID;

CREATE INDEX "Client_assignedUserId_idx" ON "Client"("assignedUserId");
