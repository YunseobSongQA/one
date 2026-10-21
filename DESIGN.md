# 설계 — 만다라트 관리 PWA

운영 원칙: "근무 시간엔 최대 효율, 가정 시간엔 가정에 충실."
앱은 현재 시각으로 모드를 판정하고 그 모드에 맞는 항목만 보여준다.

## 1. 화면 목록

공통: 상단바(화면마다 내용이 다름) + 본문 + 하단 탭 4개(오늘 / 만다라트 / 회고 / 설정).
시스템 폰트, safe-area 반영, 앱 UI는 라이트/다크 지원(차트는 다크에서도 흰 배경).

| 화면 | 상단바 | 본문 |
|---|---|---|
| 오늘 (첫 화면) | 날짜, 현재 모드(근무/출퇴근/가정/주말), 원칙 문구 | 습관 목록: 탭하면 오늘 체크/해제, 줄마다 이번 기간 달성 현황(`2/3`). '전체 보기' 토글 |
| 만다라트 9×9 | 차트 전환(가치관·커리어), 이미지 저장, 커리어면 `가치관 › 생산활동` 경로, '편집 모드'·'진행률' 토글 | 9×9 차트. 스크롤 없이 상단바와 탭바를 뺀 영역에 다 들어간다 |
| 만다라트 블록 확대 | 위와 같음 | `‹ 전체`, 블록 이름, 생산활동 블록이면 `커리어 만다라트 ›` / 3×3 확대 차트 |
| 칸 편집 시트 | — | 텍스트, 종류(값/습관/할 일), 빈도·시간대(습관), 완료(할 일). 목표·테마 칸은 텍스트만 |
| 회고 | ISO 주(예: 2026-W43)와 날짜 범위, `‹ ›`로 지난 주 이동 | 차트별 블록 달성률 막대, 잘한 것 / 아쉬운 것 / 다음 주 한 가지 |
| 설정 | — | 근무 요일·시작·종료, 출퇴근 여유(분), 원칙 문구 / 내보내기·가져오기 / 차트별 빈 차트로 시작 / 데이터 초기화 / (3단계) 동기화 토큰 |

### 만다라트 탭 동작

| 상황 | 탭하면 |
|---|---|
| 9×9, 편집 모드 끔 | 그 블록의 3×3 확대 화면 |
| 9×9, 편집 모드 켬 | 칸 편집 시트 |
| 확대 화면 | 칸 편집 시트. 단, 링크 칸('커리어 만다라트')은 편집 모드가 꺼져 있으면 커리어 차트로 이동 |
| 빈 칸(연한 '+') | 어느 화면이든 편집 시트를 열고 입력란에 바로 포커스 |

- 커리어 차트의 `가치관 › 생산활동` 경로를 탭하면 가치관 차트의 생산활동 블록 확대 화면으로 간다.
- 할 일을 완료하면 칸 글자 앞에 `✓`를 붙여 그린다.
- 진행률 토글(기본 꺼짐): 습관 칸 하단에 이번 기간 달성률 막대.
- 이미지 저장: 현재 차트의 9×9를 canvas에 직접 그려 1920px PNG를 만든다(진행률이 켜져 있으면 막대도 그림).
  `navigator.share({ files })`를 쓰고, 지원하지 않으면 새 탭에 열어 길게 눌러 저장하게 한다.
  share는 사용자 탭 직후에만 허용되므로 PNG는 `toDataURL`로 동기 생성한다.
- 백업 파일 저장은 `<a download>`로 내려받는다. 가져오기와 빈 차트로 시작은 마지막 확인을 앱 안 시트의 버튼으로 받아,
  그 탭에서 바로 백업 파일을 내려받고 실행한다(아이폰은 사용자 탭 안에서만 파일 저장이 확실히 동작).

## 2. 데이터 모델

localStorage 단일 키 `mandalart:v1`에 state 전체를 JSON으로 저장한다.

```js
state = {
  version: 1,
  updatedAt: "2026-10-21T09:00:00.000Z",  // 변경할 때마다 갱신. seed로 막 만든 state는 1970-01-01(가장 오래됨)
  settings: { workDays: [1,2,3,4,5], workStart: "09:00", workEnd: "18:00", commuteMinutes: 60,
              principle: "근무 시간엔 최대 효율, 가정 시간엔 가정에 충실" },
  charts: [chart, chart],
  logs: { "2026-10-21": ["수면 7시간", ...] },  // 날짜별로 체크한 habitKey
  reviews: { "2026-W43": { good, bad, next } }
}
chart = { id: "life" | "career", title, goal, parent, themes: [theme × 8] }
        // parent: null | { chart: "life", theme: "life-1", item: "life-1-6" }
theme = { id: "life-1", title: "생산활동", items: [item × 8] }
item  = { id: "life-1-6", text, kind: "value" | "habit" | "task",
          freq: { type: "daily" | "weekdays" | "weekly" | "monthly", count },
          slot: "work" | "commute" | "home" | "weekend" | "any", habitKey: string | null, done: boolean }
```

- themes·items 배열 순서 = 격자 위치: 좌상, 상, 우상, 좌, 우, 좌하, 하, 우하(가운데 제외).
  위치가 고정이므로 id도 위치로 정한다(`차트-테마`, `차트-테마-칸`).
- 테마 이름은 `theme.title` 하나뿐이다. 중앙 블록의 칸과 바깥 블록의 가운데 칸이 같은 값을 그린다.
- 빈 칸은 `text: ""`. 텍스트를 지우고 저장하면 그 칸은 기본값(값, 매일, 언제나, habitKey 없음)으로 돌아간다.
- habitKey: 칸을 습관으로 지정할 때 텍스트의 앞뒤 공백을 지우고 연속 공백을 하나로 줄여 정한다.
  텍스트를 고쳐도 유지해 기록을 보존한다. habitKey가 같으면 한 습관으로 취급하고 체크를 공유한다.
- parent: 커리어 차트는 가치관 '생산활동' 테마를 펼친 하위 차트다. 이름이 아닌 id로 참조해서
  테마 이름을 바꾸거나 차트를 비워도 연결이 유지된다. `item`은 커리어 차트로 이동하는 링크 칸이다.
- workDays는 JS `getDay()` 번호(일 0 … 토 6)를 쓴다.
- 화면 상태(현재 탭·차트·확대 블록·토글)는 저장하지 않는다. 앱을 다시 열면 오늘 탭, 토글 꺼짐으로 시작한다.
- 동기화 토큰(3단계)은 기기별 비밀값이라 state에 넣지 않고 별도 키 `mandalart:token`에 둔다(백업·동기화 대상 아님).

### 달성률 (순수 함수, 기준 시각 now)

| freq | 분자 / 분모 |
|---|---|
| daily | 이번 주(월~오늘) 체크한 날 수 / 이번 주 지난 날 수(오늘 포함) |
| weekdays | 이번 주 체크한 평일(월~금) 수 / 이번 주 지난 평일 수 |
| weekly N | 이번 ISO 주 체크 수 / N |
| monthly N | 이번 달 체크 수 / N |

달성률 = min(1, 분자 / 분모). 오늘 목록은 `분자/분모`, 막대는 달성률을 쓴다.
블록 달성률 = 블록 안 습관 달성률의 평균(습관이 없으면 표시하지 않음). 지난 주 회고는 그 주 일요일을 기준 시각으로 계산한다.

### seed (src/seed.js)

- `settings` 객체와 `charts` 텍스트. 텍스트는 작업 지시서 8장 표기를 그대로 쓰고, 헤더에 차트 id와 링크 칸만 덧붙였다.
  - `[life 가치관] 중심: 자연스럽게 평화를 지키는 사람`
  - `[career 커리어] 중심: … (상위: 가치관 › 생산활동 › 커리어 만다라트)`
  - `- 테마: 칸 | 칸 | …` 8줄. 습관은 `텍스트{빈도·시간대}`(매일/평일/주N/월N · 근무/출퇴근/가정/주말/언제나), 표기가 없으면 값.
- 파서는 차트마다 테마 8개 × 칸 8개를 검증하고, 같은 텍스트의 습관에 같은 habitKey를 준다.

## 3. 파일 트리

```
index.html              앱 셸: 상단바·본문·탭바·시트·업데이트 배너
manifest.webmanifest
sw.js                   앱 셸 캐시, CACHE_VERSION
_headers                Cloudflare Pages 헤더
package.json            "type": "module"과 npm test만 (의존성 없음)
icons/                  icon.svg(원본), icon-180/192/512.png(일회성 생성)
src/
  app.js                state 보관·변경·저장, 탭 전환, 렌더, SW 등록
  style.css
  seed.js               초기 데이터(설정 + 만다라트 텍스트)
  core/
    storage.js          저장소 접근(localStorage, 3단계 원격)은 여기서만
    logic.js            seed 파싱, 날짜·ISO 주, 달성률, 라벨
    view.js             esc(), 토글 등 공통 DOM 조각
  today/      logic.js  모드 판정, 습관 병합·필터, 체크 토글          view.js
  mandalart/  logic.js  격자↔데이터 매핑, 칸 편집, 빈 차트, 화살표, 줄바꿈  view.js  9×9·확대·편집 시트·PNG
  review/     logic.js  블록별 달성률, 회고 저장                       view.js
  settings/   logic.js  설정 변경, 백업 파일 검증                      view.js
  sync/       logic.js  최신 판정(3단계)                              view.js  GET/PUT 흐름
functions/api/state.js  (3단계) Pages Functions: GET/PUT, KV 키 'state'
tests/                  node:test — core, today, mandalart, sync
```

## 4. 모드 판정 규칙

`getMode(date, settings)` → `work | commute | home | weekend`. 분 단위로 비교하고 위에서부터 먼저 맞는 것을 쓴다.

1. 근무 요일이고 `workStart ≤ 시각 < workEnd` → 근무
2. 근무 요일이고 `workStart − N ≤ 시각 < workStart` 또는 `workEnd ≤ 시각 < workEnd + N` → 출퇴근 (N = commuteMinutes, 기본 60)
3. 토요일·일요일 → 주말
4. 나머지 → 가정 (근무 요일이 아닌 평일 포함)

기본 설정의 경계: 07:59 가정, 08:00 출퇴근, 09:00 근무, 18:00 출퇴근, 18:59 출퇴근, 19:00 가정.

### 오늘 화면 필터

- 기본: slot이 현재 모드이거나 `any`인 습관만.
- 가정 모드: 커리어 항목(하위 차트에만 있는 습관, 예: 현직자 커피챗)도 숨긴다. 일을 떠올리게 하는 배지·경고·개수는 띄우지 않는다.
- '전체 보기': 모든 습관.
- habitKey가 같은 습관은 한 줄로 합친다(먼저 나온 칸의 텍스트·빈도·시간대).

## 5. 동기화 (3단계)

- 서버: `functions/api/state.js`가 `GET/PUT /api/state`를 받는다. `Authorization: Bearer <SYNC_TOKEN>`으로 인증하고, KV 바인딩 `SYNC_KV`의 키 `state` 하나만 get/put 한다.
- 클라이언트: 토큰이 있을 때만 동작한다. 앱을 열거나 다시 볼 때 GET → `syncDirection(local, remote)`
  - push: 서버가 비었거나 이 기기가 더 최신 → PUT
  - pull: 서버가 더 최신 → 확인을 받고 이 기기 state를 서버 것으로 바꾼다(updatedAt 그대로)
  - 변경 후 60초 디바운스로 PUT, 앱을 떠날 때(visibilitychange) 기다리던 PUT은 바로 보낸다.
