-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "UserOnboardingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tutorialKey" TEXT NOT NULL,
    "tutorialVersion" INTEGER NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserOnboardingProgress_userId_idx" ON "UserOnboardingProgress"("userId");

-- CreateIndex
CREATE INDEX "UserOnboardingProgress_tutorialKey_tutorialVersion_idx" ON "UserOnboardingProgress"("tutorialKey", "tutorialVersion");

-- CreateIndex
CREATE UNIQUE INDEX "UserOnboardingProgress_userId_tutorialKey_tutorialVersion_key" ON "UserOnboardingProgress"("userId", "tutorialKey", "tutorialVersion");

-- AddForeignKey
ALTER TABLE "UserOnboardingProgress" ADD CONSTRAINT "UserOnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
