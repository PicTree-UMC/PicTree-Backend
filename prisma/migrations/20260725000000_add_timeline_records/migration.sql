-- CreateTable
CREATE TABLE `timeline_records` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `tree_id` BIGINT NULL,
    `title` VARCHAR(100) NOT NULL,
    `content` VARCHAR(500) NULL,
    `category` ENUM('VISIT', 'FOOD', 'SHOPPING', 'ACTIVITY', 'ETC') NOT NULL,
    `visited_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `timeline_records_user_id_visited_at_id_idx`(`user_id`, `visited_at`, `id`),
    INDEX `timeline_records_tree_id_idx`(`tree_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `timeline_records`
    ADD CONSTRAINT `timeline_records_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_records`
    ADD CONSTRAINT `timeline_records_tree_id_fkey`
    FOREIGN KEY (`tree_id`) REFERENCES `trees`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tree_images`
    ADD CONSTRAINT `tree_images_timeline_record_id_fkey`
    FOREIGN KEY (`timeline_record_id`) REFERENCES `timeline_records`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
