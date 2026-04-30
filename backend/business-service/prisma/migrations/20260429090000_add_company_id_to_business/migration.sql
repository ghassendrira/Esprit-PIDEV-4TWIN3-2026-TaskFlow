ALTER TABLE "Business"
ADD COLUMN "companyId" UUID;

UPDATE "Business"
SET "companyId" = "tenantId"
WHERE "companyId" IS NULL;

ALTER TABLE "Business"
ALTER COLUMN "companyId" SET NOT NULL;

CREATE INDEX "Business_companyId_idx" ON "Business"("companyId");
