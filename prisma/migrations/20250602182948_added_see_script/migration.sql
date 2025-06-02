/*
  Warnings:

  - You are about to drop the column `fullName` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `addresses` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[emailVerificationToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "fullName",
DROP COLUMN "phone",
ALTER COLUMN "country" SET DEFAULT 'india';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");
