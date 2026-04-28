/*
  Warnings:

  - You are about to drop the `Tenant` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- DropForeignKey
ALTER TABLE "UserTenantMembership" DROP CONSTRAINT "UserTenantMembership_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserTenantMembership" DROP CONSTRAINT "UserTenantMembership_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "UserTenantMembership" DROP CONSTRAINT "UserTenantMembership_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedUntil" TIMESTAMP(3),
ADD COLUMN     "companyCategory" TEXT,
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "tempPassword" TEXT,
ADD COLUMN     "welcomeEmailSent" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Tenant";

-- CreateTable
CREATE TABLE "SecurityQuestion" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answerHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- AddForeignKey
ALTER TABLE "UserTenantMembership" ADD CONSTRAINT "UserTenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenantMembership" ADD CONSTRAINT "UserTenantMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityQuestion" ADD CONSTRAINT "SecurityQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
