-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NULL,
    `nickname` VARCHAR(50) NOT NULL,
    `profile_image_url` VARCHAR(500) NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `current_subscription_id` BIGINT NULL,
    `notification` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_current_subscription_id_id_key`(`current_subscription_id`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_accounts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `provider` VARCHAR(30) NOT NULL,
    `provider_user_id` VARCHAR(255) NOT NULL,
    `provider_email` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `social_accounts_user_id_idx`(`user_id`),
    UNIQUE INDEX `social_accounts_provider_provider_user_id_key`(`provider`, `provider_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terms` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(100) NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `content_url` VARCHAR(500) NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `effective_from` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `terms_type_version_key`(`type`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users_terms_agreements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `term_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `is_agreed` BOOLEAN NOT NULL,
    `agreed_at` DATETIME(3) NULL,
    `withdrawn_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `users_terms_agreements_term_id_idx`(`term_id`),
    INDEX `users_terms_agreements_user_id_term_id_created_at_idx`(`user_id`, `term_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `price` INTEGER NOT NULL,
    `billing_cycle` VARCHAR(20) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscription_plans_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_features` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `value_type` VARCHAR(20) NOT NULL,
    `unit` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plan_features_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plan_features` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `subscription_plan_id` BIGINT NOT NULL,
    `plan_feature_id` BIGINT NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `limit_value` INTEGER NULL,
    `text_value` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `subscription_plan_features_plan_feature_id_idx`(`plan_feature_id`),
    UNIQUE INDEX `subscription_plan_features_subscription_plan_id_plan_feature_key`(`subscription_plan_id`, `plan_feature_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users_subscriptions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `subscription_plan_id` BIGINT NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `canceled_at` DATETIME(3) NULL,
    `auto_renew` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `users_subscriptions_user_id_idx`(`user_id`),
    INDEX `users_subscriptions_subscription_plan_id_idx`(`subscription_plan_id`),
    UNIQUE INDEX `users_subscriptions_id_user_id_key`(`id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_keys` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `payment_provider` VARCHAR(30) NOT NULL,
    `billing_key` VARCHAR(500) NOT NULL,
    `customer_key` VARCHAR(255) NOT NULL,
    `card_company` VARCHAR(50) NULL,
    `card_number_masked` VARCHAR(30) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `issued_at` DATETIME(3) NOT NULL,
    `deactivated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `billing_keys_user_id_idx`(`user_id`),
    UNIQUE INDEX `billing_keys_id_user_id_key`(`id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `users_subscription_id` BIGINT NULL,
    `billing_key_id` BIGINT NULL,
    `order_id` VARCHAR(100) NOT NULL,
    `order_name` VARCHAR(100) NOT NULL,
    `amount` INTEGER NOT NULL,
    `payment_method` VARCHAR(30) NULL,
    `payment_provider` VARCHAR(30) NOT NULL,
    `provider_payment_id` VARCHAR(255) NULL,
    `status` VARCHAR(20) NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `canceled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_order_id_key`(`order_id`),
    INDEX `payments_user_id_idx`(`user_id`),
    INDEX `payments_users_subscription_id_idx`(`users_subscription_id`),
    INDEX `payments_billing_key_id_idx`(`billing_key_id`),
    UNIQUE INDEX `payments_payment_provider_provider_payment_id_key`(`payment_provider`, `provider_payment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_receipts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `payment_id` BIGINT NOT NULL,
    `receipt_url` VARCHAR(500) NULL,
    `issued_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_receipts_payment_id_key`(`payment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trees` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `address` VARCHAR(255) NULL,
    `is_favorite` BOOLEAN NOT NULL DEFAULT false,
    `mood` VARCHAR(20) NOT NULL,
    `default_image` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `trees_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tree_images` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tree_id` BIGINT NOT NULL,
    `timeline_record_id` BIGINT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `s3_key` VARCHAR(500) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `sort_order` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tree_images_tree_id_idx`(`tree_id`),
    INDEX `tree_images_timeline_record_id_idx`(`timeline_record_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `routes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `route_name` VARCHAR(100) NOT NULL,
    `total_distance_m` INTEGER NULL,
    `started_at` DATETIME(3) NOT NULL,
    `ended_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `routes_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_points` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `route_id` BIGINT NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL,

    INDEX `route_points_route_id_idx`(`route_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_current_subscription_id_id_fkey` FOREIGN KEY (`current_subscription_id`, `id`) REFERENCES `users_subscriptions`(`id`, `user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_accounts` ADD CONSTRAINT `social_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_terms_agreements` ADD CONSTRAINT `users_terms_agreements_term_id_fkey` FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_terms_agreements` ADD CONSTRAINT `users_terms_agreements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_plan_features` ADD CONSTRAINT `subscription_plan_features_subscription_plan_id_fkey` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_plan_features` ADD CONSTRAINT `subscription_plan_features_plan_feature_id_fkey` FOREIGN KEY (`plan_feature_id`) REFERENCES `plan_features`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_subscriptions` ADD CONSTRAINT `users_subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_subscriptions` ADD CONSTRAINT `users_subscriptions_subscription_plan_id_fkey` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_keys` ADD CONSTRAINT `billing_keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_users_subscription_id_user_id_fkey` FOREIGN KEY (`users_subscription_id`, `user_id`) REFERENCES `users_subscriptions`(`id`, `user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_billing_key_id_user_id_fkey` FOREIGN KEY (`billing_key_id`, `user_id`) REFERENCES `billing_keys`(`id`, `user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_receipts` ADD CONSTRAINT `payment_receipts_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trees` ADD CONSTRAINT `trees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tree_images` ADD CONSTRAINT `tree_images_tree_id_fkey` FOREIGN KEY (`tree_id`) REFERENCES `trees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_points` ADD CONSTRAINT `route_points_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
