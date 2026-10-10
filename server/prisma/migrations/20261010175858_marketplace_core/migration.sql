-- AlterTable
ALTER TABLE `User` ADD COLUMN `avatarUrl` VARCHAR(2048) NULL,
    ADD COLUMN `city` VARCHAR(120) NULL,
    ADD COLUMN `isDemo` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `passwordHash` VARCHAR(255) NULL,
    ADD COLUMN `pronouns` VARCHAR(60) NULL,
    ADD COLUMN `region` VARCHAR(120) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `Neighborhood` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(160) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `city` VARCHAR(120) NOT NULL,
    `state` CHAR(2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Neighborhood_slug_key`(`slug`),
    INDEX `Neighborhood_city_state_idx`(`city`, `state`),
    UNIQUE INDEX `Neighborhood_city_state_name_key`(`city`, `state`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProviderProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `referenceNeighborhoodId` INTEGER NULL,
    `bio` TEXT NULL,
    `serviceArea` TEXT NULL,
    `yearsExperience` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProviderProfile_userId_key`(`userId`),
    INDEX `ProviderProfile_referenceNeighborhoodId_idx`(`referenceNeighborhoodId`),
    INDEX `ProviderProfile_yearsExperience_idx`(`yearsExperience`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProviderServiceArea` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerProfileId` INTEGER NOT NULL,
    `neighborhoodId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProviderServiceArea_neighborhoodId_providerProfileId_idx`(`neighborhoodId`, `providerProfileId`),
    UNIQUE INDEX `ProviderServiceArea_providerProfileId_neighborhoodId_key`(`providerProfileId`, `neighborhoodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Category_name_key`(`name`),
    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerProfileId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NOT NULL,
    `referencePrice` DECIMAL(10, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Service_providerProfileId_isActive_idx`(`providerProfileId`, `isActive`),
    INDEX `Service_categoryId_isActive_idx`(`categoryId`, `isActive`),
    INDEX `Service_referencePrice_isActive_idx`(`referencePrice`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortfolioItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerProfileId` INTEGER NOT NULL,
    `serviceId` INTEGER NULL,
    `serviceOrderId` INTEGER NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `isDemo` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PortfolioItem_serviceOrderId_key`(`serviceOrderId`),
    INDEX `PortfolioItem_providerProfileId_createdAt_idx`(`providerProfileId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortfolioImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `portfolioItemId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(2048) NOT NULL,
    `altText` VARCHAR(255) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PortfolioImage_portfolioItemId_position_key`(`portfolioItemId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clientUserId` INTEGER NOT NULL,
    `categoryId` INTEGER NULL,
    `neighborhoodId` INTEGER NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NOT NULL,
    `city` VARCHAR(120) NULL,
    `region` VARCHAR(120) NULL,
    `budgetMin` DECIMAL(10, 2) NULL,
    `budgetMax` DECIMAL(10, 2) NULL,
    `desiredDate` DATETIME(3) NULL,
    `status` ENUM('OPEN', 'PAUSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `isDemo` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ServiceRequest_clientUserId_status_createdAt_idx`(`clientUserId`, `status`, `createdAt`),
    INDEX `ServiceRequest_categoryId_status_idx`(`categoryId`, `status`),
    INDEX `ServiceRequest_city_region_neighborhoodId_status_idx`(`city`, `region`, `neighborhoodId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceRequestId` INTEGER NOT NULL,
    `providerProfileId` INTEGER NOT NULL,
    `status` ENUM('OPEN', 'CLOSED', 'ARCHIVED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Conversation_providerProfileId_status_idx`(`providerProfileId`, `status`),
    UNIQUE INDEX `Conversation_serviceRequestId_providerProfileId_key`(`serviceRequestId`, `providerProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversationId` INTEGER NOT NULL,
    `senderUserId` INTEGER NOT NULL,
    `type` ENUM('TEXT', 'QUOTE') NOT NULL DEFAULT 'TEXT',
    `body` TEXT NULL,
    `quoteVersionId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Message_quoteVersionId_key`(`quoteVersionId`),
    INDEX `Message_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversationId` INTEGER NOT NULL,
    `serviceId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Quote_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    INDEX `Quote_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuoteVersion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quoteId` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `previousVersionId` INTEGER NULL,
    `scopeDescription` TEXT NOT NULL,
    `serviceTitleSnapshot` VARCHAR(180) NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `estimatedDurationDays` INTEGER NULL,
    `validUntil` DATETIME(3) NOT NULL,
    `proposedStartAt` DATETIME(3) NULL,
    `proposedEndAt` DATETIME(3) NULL,
    `terms` TEXT NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `QuoteVersion_previousVersionId_key`(`previousVersionId`),
    INDEX `QuoteVersion_quoteId_status_idx`(`quoteId`, `status`),
    INDEX `QuoteVersion_status_validUntil_idx`(`status`, `validUntil`),
    UNIQUE INDEX `QuoteVersion_quoteId_version_key`(`quoteId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuoteItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quoteVersionId` INTEGER NOT NULL,
    `position` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `QuoteItem_quoteVersionId_position_key`(`quoteVersionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceRequestId` INTEGER NOT NULL,
    `acceptedQuoteVersionId` INTEGER NOT NULL,
    `status` ENUM('ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACCEPTED',
    `isDemo` BOOLEAN NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ServiceOrder_serviceRequestId_key`(`serviceRequestId`),
    UNIQUE INDEX `ServiceOrder_acceptedQuoteVersionId_key`(`acceptedQuoteVersionId`),
    INDEX `ServiceOrder_status_completedAt_idx`(`status`, `completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceOrderId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `isDemo` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Review_serviceOrderId_key`(`serviceOrderId`),
    INDEX `Review_isDemo_createdAt_idx`(`isDemo`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Availability` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerProfileId` INTEGER NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startMinute` INTEGER NOT NULL,
    `endMinute` INTEGER NOT NULL,
    `timeZone` VARCHAR(64) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Availability_providerProfileId_dayOfWeek_isActive_idx`(`providerProfileId`, `dayOfWeek`, `isActive`),
    INDEX `Availability_dayOfWeek_isActive_providerProfileId_idx`(`dayOfWeek`, `isActive`, `providerProfileId`),
    UNIQUE INDEX `Availability_providerProfileId_dayOfWeek_startMinute_endMinu_key`(`providerProfileId`, `dayOfWeek`, `startMinute`, `endMinute`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProviderProfile` ADD CONSTRAINT `ProviderProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProviderProfile` ADD CONSTRAINT `ProviderProfile_referenceNeighborhoodId_fkey` FOREIGN KEY (`referenceNeighborhoodId`) REFERENCES `Neighborhood`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProviderServiceArea` ADD CONSTRAINT `ProviderServiceArea_providerProfileId_fkey` FOREIGN KEY (`providerProfileId`) REFERENCES `ProviderProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProviderServiceArea` ADD CONSTRAINT `ProviderServiceArea_neighborhoodId_fkey` FOREIGN KEY (`neighborhoodId`) REFERENCES `Neighborhood`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_providerProfileId_fkey` FOREIGN KEY (`providerProfileId`) REFERENCES `ProviderProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioItem` ADD CONSTRAINT `PortfolioItem_providerProfileId_fkey` FOREIGN KEY (`providerProfileId`) REFERENCES `ProviderProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioItem` ADD CONSTRAINT `PortfolioItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioItem` ADD CONSTRAINT `PortfolioItem_serviceOrderId_fkey` FOREIGN KEY (`serviceOrderId`) REFERENCES `ServiceOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioImage` ADD CONSTRAINT `PortfolioImage_portfolioItemId_fkey` FOREIGN KEY (`portfolioItemId`) REFERENCES `PortfolioItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceRequest` ADD CONSTRAINT `ServiceRequest_clientUserId_fkey` FOREIGN KEY (`clientUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceRequest` ADD CONSTRAINT `ServiceRequest_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceRequest` ADD CONSTRAINT `ServiceRequest_neighborhoodId_fkey` FOREIGN KEY (`neighborhoodId`) REFERENCES `Neighborhood`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_serviceRequestId_fkey` FOREIGN KEY (`serviceRequestId`) REFERENCES `ServiceRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_providerProfileId_fkey` FOREIGN KEY (`providerProfileId`) REFERENCES `ProviderProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderUserId_fkey` FOREIGN KEY (`senderUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_quoteVersionId_fkey` FOREIGN KEY (`quoteVersionId`) REFERENCES `QuoteVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuoteVersion` ADD CONSTRAINT `QuoteVersion_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuoteVersion` ADD CONSTRAINT `QuoteVersion_previousVersionId_fkey` FOREIGN KEY (`previousVersionId`) REFERENCES `QuoteVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuoteItem` ADD CONSTRAINT `QuoteItem_quoteVersionId_fkey` FOREIGN KEY (`quoteVersionId`) REFERENCES `QuoteVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_serviceRequestId_fkey` FOREIGN KEY (`serviceRequestId`) REFERENCES `ServiceRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_acceptedQuoteVersionId_fkey` FOREIGN KEY (`acceptedQuoteVersionId`) REFERENCES `QuoteVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_serviceOrderId_fkey` FOREIGN KEY (`serviceOrderId`) REFERENCES `ServiceOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Availability` ADD CONSTRAINT `Availability_providerProfileId_fkey` FOREIGN KEY (`providerProfileId`) REFERENCES `ProviderProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
