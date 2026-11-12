# 전적 기록 앱

## 프로젝트 개요
카드게임(현재 주로 디지몬 카드게임) 개인 전적 기록/통계 웹앱. 모바일 우선(갤럭시 S24 Ultra), 사용자 1명.
저장소: github.com/Plir843/cardgame-record, 배포 주소: https://plir843.github.io/cardgame-record/
서버와 로그인 없이 브라우저 IndexedDB 에만 저장하는 PWA. GitHub Pages 로 배포한다(상대 경로 빌드 + HashRouter 라 하위 경로에서도 동작).

## 기술 스택
Vite, React, TypeScript, Tailwind CSS v4, Dexie(IndexedDB), react-router(HashRouter), vite-plugin-pwa

## 구조
- `src/db/schema.ts` 데이터 모델, `src/db/db.ts` Dexie 스키마(버전별), `src/db/repo.ts` 모든 쓰기 함수, `src/db/hooks.ts` 읽기용 실시간 쿼리, `src/db/backup.ts` JSON/CSV
- `src/domain/` 순수 함수: `stats.ts`(통계), `summary.ts`(대회 요약·다음 라운드·공유 텍스트), `deckRanking.ts`(상대 덱 빠른 선택 순서)
- `src/features/` 화면: events(대회), matches(라운드 입력/수정), stats, decks, settings
- `src/components/` 공통 UI

## 핵심 규칙 (데이터)
- 대회(EventRecord) 안에 라운드(Match)를 추가한다. `eventId` 가 null 인 Match 는 단독(친선) 기록.
- 단판/Bo3 는 라운드마다 설정. 기본값은 예선·16강·8강 단판, 4강·결승 Bo3. Bo3 는 매치 결과와 1게임 선후공만 기록.
- Match 의 `date·format·myDeckId` 는 대회 값을 복사한 것. 대회를 수정하면 `repo.updateEvent` 가 함께 갱신한다.
- 통계: 부전승 제외, 무승부는 판수에 포함, 선후공 승률은 단판만 집계.
- 최종 순위는 직접 입력(자동 계산 불가).
- 덱은 삭제하지 않고 숨김(archived) 처리한다.
- 특이사항은 라운드(Match) 메모에 적는다. `EventRecord.memo` 는 스키마에만 있고 화면에서 쓰지 않는다.

## 작업 규칙
- 답변과 코드 주석은 한국어로.
- 새 기능은 계획을 먼저 보여주고 승인 후 구현.
- 기존 데이터 구조(스키마)를 바꿀 때는 기존 기록이 깨지지 않게 마이그레이션 방법을 같이 제시.
  (`db.ts` 에 `db.version(n).stores().upgrade()` 추가, `schema.ts` 의 `SCHEMA_VERSION` 올리기, `backup.ts` 의 `parseBackup` 에 이전 버전 변환 추가)
- 기능 하나 끝날 때마다 `npm run build` 와 `npm test` 로 오류 없는지 확인.
- 통계·요약 규칙을 바꾸면 `src/domain/*.test.ts` 테스트도 같이 고친다. 테스트용 데이터는 `src/test/fixtures.ts`.
- 불필요한 라이브러리 추가 전에 먼저 물어볼 것.

## 실행
- `npm run dev` 개발 서버, `npm run dev:host` 같은 Wi-Fi 의 폰에서 접속
- `npm run build` 후 `npm run preview` 로 PWA(오프라인) 확인. 서비스 워커는 빌드 결과물에서만 동작한다.
- `npm test` 자동 테스트(vitest, 순수 함수와 백업 파일 검사), `npm run test:watch` 저장할 때마다 실행

## 배포
- `main` 에 push 하면 `.github/workflows/deploy.yml` 이 테스트 → 빌드 → GitHub Pages 배포를 한다. 테스트가 실패하면 배포하지 않는다.
- 배포 후 폰에서는 앱 안의 "새 버전이 있습니다 → 업데이트" 를 눌러야 새 버전이 적용된다.

## 의존성 메모
- `package.json` 의 `overrides.glob` 은 workbox-build 의 glob 보안 경고를 없애려고 고정한 것. vite-plugin-pwa 를 올릴 때 필요 없어졌는지 `npm audit` 로 확인한다.
- `npm audit` 의 deepmerge 경고(낮음)는 고친 버전이 없어 남겨 둔다. 빌드할 때만 쓰이고 앱 화면에는 들어가지 않는다.

## 2차 이후 (미구현)
- 기간/포맷별 필터: `domain/stats.ts` 의 `StatsFilter` 가 이미 `from·to·format` 을 받으므로 화면만 추가하면 된다.
- 클라우드 동기화: 모든 레코드가 UUID 와 `updatedAt` 을 가진다. `repo.ts` 계층을 확장한다.
