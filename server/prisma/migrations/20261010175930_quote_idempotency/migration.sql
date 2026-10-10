-- Persist client request keys so retries cannot create duplicate offers or revisions.
ALTER TABLE `Quote`
    ADD COLUMN `idempotencyKey` VARCHAR(64) NULL,
    ADD COLUMN `idempotencyHash` CHAR(64) NULL;
CREATE UNIQUE INDEX `Quote_idempotencyKey_key` ON `Quote`(`idempotencyKey`);

ALTER TABLE `QuoteVersion`
    ADD COLUMN `idempotencyKey` VARCHAR(64) NULL,
    ADD COLUMN `idempotencyHash` CHAR(64) NULL;
CREATE UNIQUE INDEX `QuoteVersion_idempotencyKey_key` ON `QuoteVersion`(`idempotencyKey`);
