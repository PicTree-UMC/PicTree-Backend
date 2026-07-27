-- 동선(Route)을 GPS 좌표 저장에서 나무(장소) 참조 구조로 변경한다.
-- 동선 노드 = 사용자가 기록한 나무. 방문 순서(sequence)로 직선 연결한다.

-- AlterTable: routes 에서 화면 미사용 필드 제거
ALTER TABLE `routes`
    DROP COLUMN `total_distance_m`,
    DROP COLUMN `started_at`,
    DROP COLUMN `ended_at`;

-- AlterTable: route_points 를 좌표에서 나무 참조로 변경
ALTER TABLE `route_points`
    DROP COLUMN `latitude`,
    DROP COLUMN `longitude`,
    DROP COLUMN `recorded_at`,
    ADD COLUMN `tree_id` BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX `route_points_tree_id_idx` ON `route_points`(`tree_id`);

-- AddForeignKey
ALTER TABLE `route_points` ADD CONSTRAINT `route_points_tree_id_fkey` FOREIGN KEY (`tree_id`) REFERENCES `trees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
