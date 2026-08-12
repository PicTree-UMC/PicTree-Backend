# PicTree-Backend

**PicTree** 백엔드 레포지토리입니다.

## 👤 백엔드 팀원 소개

|                                   Backend                                   |                                    Backend                                    |                            Backend                            |                               Backend                                |
| :-------------------------------------------------------------------------: | :---------------------------------------------------------------------------: | :-----------------------------------------------------------: | :------------------------------------------------------------------: |
|          <img src="https://github.com/HeejuKo.png" width="150" />           |        <img src="https://github.com/kim-seungbeom.png" width="150" />         |   <img src="https://github.com/02junho.png" width="150" />    |       <img src="https://github.com/sooowii.png" width="150" />       |
| [고희주](https://github.com/HeejuKo)<br/>AI 블로그 초안 작성<br/>마이페이지 | [김승범](https://github.com/kim-seungbeom)<br/>소셜 로그인<br/>유료 구독 결제 | [신준호](https://github.com/02junho)<br/>지도 페이지<br/>배포 | [정수영](https://github.com/sooowii)<br/>타임라인<br/>근처 나무 알림 |

## 🧰 Tech Stack

#### 🛠 Backend & Framework

<div>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white">
  <img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white">
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white">
</div>

#### 🔐 Authentication & Security

<div>
  <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white">
  <img src="https://img.shields.io/badge/OAuth2-000000?style=flat-square&logo=oauth&logoColor=white">
</div>

#### 🗄 Database

<div>
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white">
</div>

#### ☁️ Cloud

<div>
  <img src="https://img.shields.io/badge/AWS%20EC2-FF9900?style=flat-square">
  <img src="https://img.shields.io/badge/AWS%20RDS-527FFF?style=flat-square">
  <img src="https://img.shields.io/badge/AWS%20S3-569A31?style=flat-square">
</div>

#### 🔗 External APIs

<div>
  <img src="https://img.shields.io/badge/Google%20OAuth-4285F4?style=flat-square&logo=google&logoColor=white">
  <img src="https://img.shields.io/badge/Kakao%20Developers-FFCD00?style=flat-square&logo=kakao&logoColor=black">
  <img src="https://img.shields.io/badge/OpenAI-000000?style=flat-square">
  <img src="https://img.shields.io/badge/Toss%20Payments-0064FF?style=flat-square&logoColor=white">
</div>

#### 🔔 Notification

<div>
  <img src="https://img.shields.io/badge/Web%20Push-5A0FC8?style=flat-square&logo=googlemessages&logoColor=white">
</div>

#### 🚀 DevOps

<div>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white">
  <img src="https://img.shields.io/badge/Docker%20Compose-2496ED?style=flat-square&logo=docker&logoColor=white">
  <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white">
</div>

#### 🧪 Docs & Test

<div>
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black">
  <img src="https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white">
  <img src="https://img.shields.io/badge/Supertest-6E6E6E?style=flat-square&logoColor=white">
  <img src="https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white">
  <img src="https://img.shields.io/badge/Prettier-F7B93E?style=flat-square&logo=prettier&logoColor=black">
</div>

## 🏗 Architecture
<img width="4056" height="1968" alt="PicTree drawio" src="https://github.com/user-attachments/assets/4f186b55-022f-4c31-964e-f8e8a98d9116" />

## 🗄 ERD
<img width="1847" height="932" alt="PicTree" src="https://github.com/user-attachments/assets/82fbd989-3e02-4629-97d3-f8e04a8c46e0" />

## 📖 API Documentation

프로젝트의 전체 API 명세는 Swagger UI를 통해 확인할 수 있습니다.

🔗 [Swagger UI](https://tenma.store/swagger)

## 📂 Directory Structure

```
📦 PicTree-Backend
 ├── 📁 prisma                     # Prisma 스키마 및 마이그레이션
 ├── 📁 scripts                    # 배포 및 운영 스크립트
 ├── 📁 src
 │   ├── 📁 common                 # 공통 예외, 응답, 유틸, S3 처리
 │   ├── 📁 config                 # 환경 설정
 │   ├── 📁 modules                # 도메인별 API 모듈
 │   │   ├── 📁 auth               # 소셜 로그인, JWT 인증
 │   │   ├── 📁 billing-keys       # 결제 빌링키 관리
 │   │   ├── 📁 blog-drafts        # AI 블로그 초안 생성/저장/조회/삭제
 │   │   ├── 📁 calendar           # 여행 캘린더 조회
 │   │   ├── 📁 nearby-alerts      # 근처 나무 알림
 │   │   ├── 📁 payments           # 결제 요청/승인/웹훅
 │   │   ├── 📁 push-subscriptions # 웹 푸시 구독 관리
 │   │   ├── 📁 routes             # 여행 동선 관리
 │   │   ├── 📁 subscription-plans # 구독 요금제 조회
 │   │   ├── 📁 subscriptions      # 사용자 구독 관리
 │   │   ├── 📁 terms              # 약관 조회/동의
 │   │   ├── 📁 tree-images        # 나무 이미지 업로드/조회/삭제
 │   │   ├── 📁 trees              # 나무 장소 관리
 │   │   └── 📁 users              # 사용자 정보 관리
 │   └── 📁 prisma                 # PrismaService
 ├── 📁 test                       # E2E 테스트 설정
 ├── 📄 Dockerfile
 └── 📄 docker-compose.yml
```

## 📋 Github Workflow

### 작업 흐름

1. 작업 시작 전 GitHub Issue 생성
2. 생성한 Issue를 GitHub Project Board에 연결
3. develop 브랜치 기준 작업 브랜치 생성
4. 작업 진행 후 Commit Convention에 맞게 커밋
5. 작업 완료 후 develop 브랜치로 Pull Request 생성
6. PR 생성 시 관련 Issue 연결 (Closes #이슈번호)
7. Merge 후 Project 상태 업데이트

#### 작업 전 규칙

- 모든 작업 시작 전, 작업 브랜치에서 최신 develop 브랜치를 pull

#### PR 전 규칙

- PR 생성 전 원격 develop 브랜치에 변경 사항이 있을 경우  
  작업 브랜치에 develop 브랜치 merge 후 PR 생성

### 브랜치 전략

```
main       -> 배포 브랜치
develop    -> 개발 통합 브랜치
feature/*  -> 기능 개발 브랜치
fix/*      -> 버그 수정 브랜치
refactor/* -> 리팩토링 브랜치
chore/*    -> 설정/환경 작업 브랜치
```

### Commit Message Convention

형식

```
type(scope): commit message (#issue-number)
```

예시

```
feat(auth): 회원가입 기능 추가 (#5)
fix(upload): 이미지 업로드 오류 수정 (#18)
```

| Type     | 의미                              |
| -------- | --------------------------------- |
| feat     | 새로운 기능 추가                  |
| fix      | 버그 수정                         |
| docs     | 문서 수정                         |
| style    | 코드 스타일 수정 (로직 변경 없음) |
| refactor | 리팩토링                          |
| test     | 테스트 코드 추가/수정             |
| chore    | 설정, 의존성, 기타 작업           |
| perf     | 성능 개선                         |
| ci       | CI/CD 설정 변경                   |
| build    | 빌드 관련 작업                    |
| revert   | 이전 커밋 되돌리기                |
