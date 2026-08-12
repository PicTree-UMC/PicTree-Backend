-- AlterTable
ALTER TABLE `users_subscriptions`
    ADD COLUMN `pending_plan_id` BIGINT NULL,
    ADD COLUMN `plan_change_requested_at` DATETIME(3) NULL,
    ADD COLUMN `renewal_attempt_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `renewal_retry_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `users_subscriptions_pending_plan_id_idx`
    ON `users_subscriptions`(`pending_plan_id`);

-- CreateIndex
CREATE INDEX `users_subscriptions_auto_renew_expires_at_renewal_retry_at_idx`
    ON `users_subscriptions`(`auto_renew`, `expires_at`, `renewal_retry_at`);

-- AddForeignKey
ALTER TABLE `users_subscriptions`
    ADD CONSTRAINT `users_subscriptions_pending_plan_id_fkey`
    FOREIGN KEY (`pending_plan_id`) REFERENCES `subscription_plans`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
