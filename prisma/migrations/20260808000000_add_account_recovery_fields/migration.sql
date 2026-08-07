-- AlterTable
ALTER TABLE `users`
    ADD COLUMN `token_version` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `scheduled_deletion_at` DATETIME(3) NULL;

-- Backfill existing withdrawn users so they follow the same recovery policy.
UPDATE `users`
SET `scheduled_deletion_at` = DATE_ADD(
    COALESCE(`deleted_at`, CURRENT_TIMESTAMP(3)),
    INTERVAL 30 DAY
)
WHERE `status` = 'WITHDRAWN';

-- CreateIndex
CREATE INDEX `users_status_scheduled_deletion_at_idx`
    ON `users`(`status`, `scheduled_deletion_at`);
