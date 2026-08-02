-- 기존 나무 중 활성 타임라인이 없는 데이터에 기본 타임라인을 생성한다.
-- 이후 생성되는 나무는 애플리케이션 트랜잭션에서 타임라인과 함께 생성된다.
INSERT INTO `timeline_records` (
    `user_id`,
    `tree_id`,
    `title`,
    `content`,
    `category`,
    `visited_at`,
    `created_at`,
    `updated_at`
)
SELECT
    tree.`user_id`,
    tree.`id`,
    tree.`name`,
    tree.`description`,
    'VISIT',
    tree.`created_at`,
    tree.`created_at`,
    tree.`updated_at`
FROM `trees` AS tree
WHERE tree.`deleted_at` IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM `timeline_records` AS timeline
      WHERE timeline.`tree_id` = tree.`id`
        AND timeline.`deleted_at` IS NULL
  );
