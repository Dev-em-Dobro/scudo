-- CreateTable
CREATE TABLE "UserJornadaTaskProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserJornadaTaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserJornadaTaskProgress_userId_taskId_key" ON "UserJornadaTaskProgress"("userId", "taskId");

-- CreateIndex
CREATE INDEX "UserJornadaTaskProgress_userId_idx" ON "UserJornadaTaskProgress"("userId");

-- CreateIndex
CREATE INDEX "UserJornadaTaskProgress_taskId_idx" ON "UserJornadaTaskProgress"("taskId");

-- AddForeignKey
ALTER TABLE "UserJornadaTaskProgress" ADD CONSTRAINT "UserJornadaTaskProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
