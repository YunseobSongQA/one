# 만다라트

아이폰 홈 화면에 설치해서 쓰는 개인용 만다라트·계획 관리 PWA.
"근무 시간엔 최대 효율, 가정 시간엔 가정에 충실." — 현재 시각으로 모드(근무/출퇴근/가정/주말)를 판정해 그 모드의 습관만 보여준다.

빌드 단계 없는 Vanilla JS(ES 모듈)다. 설계는 [DESIGN.md](DESIGN.md), 작업 규칙은 [CLAUDE.md](CLAUDE.md)에 있다.

## 주의: 아이폰의 저장 공간

- 데이터는 그 기기 브라우저의 localStorage(`mandalart:v1`) 한 곳에만 저장된다.
- 아이폰은 **Safari와 홈 화면 앱의 저장 공간이 분리**되어 있다. Safari에서 입력한 데이터는 홈 화면 앱에서 보이지 않는다.
  - 홈 화면에 추가한 뒤, 홈 화면 앱에서 사용한다.
  - 이미 Safari에서 입력했다면 Safari에서 설정 → 내보내기로 백업 파일을 만들고, 홈 화면 앱에서 설정 → 가져오기로 옮긴다.
- 가끔 설정 → 내보내기로 백업해 둔다.

## 로컬 확인 (모바일 Codespaces)

```sh
python3 -m http.server 8080
gh codespace ports visibility 8080:public -c $CODESPACE_NAME
```

Codespaces 포트 탭의 8080 주소(`https://…-8080.app.github.dev`)를 아이폰 Safari로 연다.

## 테스트

```sh
node --test
```

## 배포 (Cloudflare Pages)

### 1) GitHub 연동

1. Cloudflare 대시보드 → Workers & Pages → 만들기 → Pages → Git에 연결 → 이 저장소를 고른다.
2. 프레임워크 사전 설정: 없음 / 빌드 명령: 비워 둠 / 빌드 출력 디렉터리: `/`(루트)
3. 프로덕션 브랜치는 `main`. 그 밖의 브랜치(`dev`)에 푸시하면 미리보기로 배포된다.

### 2) CLI

```sh
npx wrangler pages deploy . --project-name mandalart
```

처음 한 번은 `npx wrangler login`으로 로그인한다. CLI는 현재 폴더의 파일을 모두 올리므로, 공개하고 싶지 않은 파일(예: `prompt*.txt`)은 옮긴 뒤 배포한다.

`_headers`가 `/sw.js`에는 `Cache-Control: no-cache`를, `/manifest.webmanifest`에는 `Content-Type: application/manifest+json`을 붙인다.

## 기기 간 동기화 (선택)

여러 기기에서 같은 데이터를 쓰려면 Pages Functions(`functions/api/state.js`)에 KV와 토큰을 연결한다. 설정하지 않으면 앱은 그 기기 안에서만 동작한다.

1. Cloudflare 대시보드의 KV 메뉴에서 네임스페이스를 만든다(예: `mandalart-sync`).
2. Pages 프로젝트 → 설정(Settings) → 바인딩(Bindings) → 추가 → KV 네임스페이스: 변수 이름 `SYNC_KV`, 1에서 만든 네임스페이스를 고른다.
3. Pages 프로젝트 → 설정 → 변수 및 비밀(Variables and Secrets) → 추가: 유형 Secret, 이름 `SYNC_TOKEN`, 값은 긴 임의 문자열(예: `openssl rand -hex 32`의 결과).
   CLI로는 `npx wrangler pages secret put SYNC_TOKEN --project-name mandalart`.
4. 다시 배포한다(바인딩과 비밀은 새 배포부터 적용). 미리보기(`dev`)에서도 쓰려면 미리보기 환경에도 같은 설정을 한다.
5. 기기마다 앱 → 설정 → 기기 간 동기화에 같은 토큰을 넣고 '지금 동기화'를 누른다.

- 동작: 앱을 열거나 다시 볼 때 서버와 비교해 `updatedAt`이 최신인 쪽을 따른다. 서버가 더 최신이면 덮어쓰기 전에 확인을 받는다.
  바꾼 뒤 60초 동안 더 바뀌지 않으면 서버에 올리고, 앱을 떠날 때 기다리던 업로드는 바로 보낸다.
- KV는 키 `state` 하나만 get/put 한다(`list()`는 무료 한도를 빨리 써서 쓰지 않는다).
- 설정 화면의 오류: `서버 응답 401` 토큰이 다름 / `503` 서버에 `SYNC_TOKEN`·`SYNC_KV`가 없음 / `404` Functions가 없음(로컬 `python3 -m http.server` 포함).
- 로컬에서 Functions까지 확인: `npx wrangler pages dev . --kv SYNC_KV --binding SYNC_TOKEN=test`

## 아이폰 홈 화면에 추가

1. 배포 주소를 **Safari**로 연다.
2. 공유 버튼 → **홈 화면에 추가** → 추가.
3. 이제 홈 화면의 '만다라트' 아이콘으로 연다. (위의 저장 공간 주의 참고)

## 업데이트

- 앱 파일(index.html, manifest, src/, icons/)을 바꾸면 `sw.js`의 `CACHE_VERSION`을 올린다. 파일을 추가·삭제하면 `SHELL` 목록도 고친다.
- 배포 후 앱을 열면 "새 버전이 있어요 · 탭해서 적용" 배너가 뜬다. 탭하면 새 버전으로 다시 열린다.

## 아이콘

원본은 `icons/icon.svg` 하나다. PNG(180/192/512)는 Codespaces에서 한 번 만들어 커밋했다. 다시 만들 때:

```sh
sudo apt-get install -y librsvg2-bin
for s in 180 192 512; do rsvg-convert -w $s -h $s icons/icon.svg -o icons/icon-$s.png; done
```