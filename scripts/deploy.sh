#!/usr/bin/env bash
#
# EC2 배포 스크립트
#
# 사용법:
#   ./scripts/deploy.sh            # develop 브랜치 배포 (기본값)
#   ./scripts/deploy.sh main       # 특정 브랜치 배포
#
# 스키마가 변경된 배포에서는 이 스크립트 실행 전에 마이그레이션을 먼저 적용합니다.
#   npx prisma migrate deploy
#
set -euo pipefail

BRANCH="${1:-develop}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="pictree-backend"
CONTAINER_NAME="pictree-app"
HOST_PORT="127.0.0.1:3000"
CONTAINER_PORT="3000"
HEALTH_PATH="/swagger"
HEALTH_TIMEOUT=60

log() { printf '\n▶ %s\n' "$1"; }

cd "$APP_DIR"

log "1/5 최신 코드 받기 (${BRANCH})"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/${BRANCH}"
git log --oneline -1

if [ ! -f .env ]; then
  echo "❌ .env 파일이 없습니다. 배포를 중단합니다." >&2
  exit 1
fi

log "2/5 이미지 빌드"
docker build -t "$IMAGE_NAME" .

log "3/5 기존 컨테이너 정리"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

log "4/5 새 컨테이너 실행"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --env-file .env \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  "$IMAGE_NAME" >/dev/null

log "5/5 헬스체크 (최대 ${HEALTH_TIMEOUT}초)"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  status=$(curl -s -o /dev/null -w '%{http_code}' \
    --connect-timeout 2 --max-time 5 \
    "http://${HOST_PORT}${HEALTH_PATH}" || true)
  if [ "$status" = "200" ]; then
    echo "✅ 배포 성공 (HTTP ${status})"
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 1
done

echo "❌ 헬스체크 실패 — 컨테이너 로그를 확인하세요." >&2
docker logs --tail 50 "$CONTAINER_NAME" >&2 || true
exit 1
