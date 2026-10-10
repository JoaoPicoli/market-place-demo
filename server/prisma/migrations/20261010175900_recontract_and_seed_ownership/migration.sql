-- Keep the marketplace migration intact; add the re-contract policy incrementally.
ALTER TABLE `ServiceRequest`
    ADD COLUMN `reopenedAt` DATETIME(3) NULL;

DROP INDEX `ServiceOrder_serviceRequestId_key` ON `ServiceOrder`;
CREATE INDEX `ServiceOrder_serviceRequestId_status_idx`
    ON `ServiceOrder`(`serviceRequestId`, `status`);

CREATE TABLE `DemoSeedOwnership` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seedKey` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(40) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DemoSeedOwnership_seedKey_entityType_entityId_key`(`seedKey`, `entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
