# syntax=docker/dockerfile:1

# 1) builder: 전체 의존성 설치 후 Prisma 클라이언트 생성 및 빌드
FROM node:22-alpine AS builder

# Prisma 엔진 구동에 openssl 이 필요합니다.
RUN apk add --no-cache openssl

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN pnpm build

# 운영 이미지에는 devDependencies 를 포함하지 않습니다.
# @prisma/client 는 dependencies 라 생성된 클라이언트가 함께 유지됩니다.
RUN pnpm prune --prod

# 2) runner: 빌드 결과물만 담은 실행 이미지
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# root 대신 node 유저로 실행합니다.
USER node

EXPOSE 3000

CMD ["node", "dist/main"]
