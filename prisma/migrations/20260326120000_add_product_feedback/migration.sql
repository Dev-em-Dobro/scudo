-- CreateEnum
CREATE TYPE "ProductFeedbackCategory" AS ENUM ('BUG', 'UX', 'FEATURE', 'CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductFeedbackStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'DONE', 'DECLINED');

-- CreateTable
CREATE TABLE "ProductFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "ProductFeedbackCategory" NOT NULL,
    "status" "ProductFeedbackStatus" NOT NULL DEFAULT 'RECEIVED',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedBehavior" TEXT,
    "pagePath" TEXT,
    "impact" TEXT,
    "contactEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductFeedback_userId_createdAt_idx" ON "ProductFeedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductFeedback_status_category_idx" ON "ProductFeedback"("status", "category");

-- AddForeignKey
ALTER TABLE "ProductFeedback" ADD CONSTRAINT "ProductFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
