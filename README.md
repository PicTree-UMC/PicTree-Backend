# PicTree-Backend

**PicTree** 백엔드 레포지토리입니다.

## 👤 백엔드 팀원 소개

|                                   Backend                                   |                                    Backend                                    |                            Backend                            |                               Backend                                |
| :-------------------------------------------------------------------------: | :---------------------------------------------------------------------------: | :-----------------------------------------------------------: | :------------------------------------------------------------------: |
|          <img src="https://github.com/HeejuKo.png" width="150" />           |        <img src="https://github.com/kim-seungbeom.png" width="150" />         |   <img src="https://github.com/02junho.png" width="150" />    |       <img src="https://github.com/sooowii.png" width="150" />       |
| [고희주](https://github.com/HeejuKo)<br/>AI 블로그 초안 작성<br/>마이페이지 | [김승범](https://github.com/kim-seungbeom)<br/>소셜 로그인<br/>유료 구독 결제 | [신준호](https://github.com/02junho)<br/>지도 페이지<br/>배포 | [정수영](https://github.com/sooowii)<br/>타임라인<br/>근처 나무 알림 |

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
