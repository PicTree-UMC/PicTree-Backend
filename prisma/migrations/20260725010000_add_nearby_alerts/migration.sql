-- CreateTable
CREATE TABLE `push_subscriptions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `endpoint` TEXT NOT NULL,
    `endpoint_hash` CHAR(64) NOT NULL,
    `p256dh_key` VARCHAR(255) NOT NULL,
    `auth_key` VARCHAR(255) NOT NULL,
    `user_agent` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `push_subscriptions_endpoint_hash_key`(`endpoint_hash`),
    INDEX `push_subscriptions_user_id_is_active_idx`(`user_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nearby_alert_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `tree_id` BIGINT NOT NULL,
    `distance_m` INTEGER NOT NULL,
    `alert_date` DATE NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'OPENED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `sent_at` DATETIME(3) NULL,
    `opened_at` DATETIME(3) NULL,

    INDEX `nearby_alert_logs_user_id_sent_at_idx`(`user_id`, `sent_at`),
    INDEX `nearby_alert_logs_tree_id_idx`(`tree_id`),
    UNIQUE INDEX `nearby_alert_logs_user_id_tree_id_alert_date_key`(`user_id`, `tree_id`, `alert_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nearby_alert_logs` ADD CONSTRAINT `nearby_alert_logs_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nearby_alert_logs` ADD CONSTRAINT `nearby_alert_logs_tree_id_fkey`
    FOREIGN KEY (`tree_id`) REFERENCES `trees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
