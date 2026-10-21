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

처음 한 번은 `npx wrangler login`으로 로그인한다.

`_headers`가 `/sw.js`에는 `Cache-Control: no-cache`를, `/manifest.webmanifest`에는 `Content-Type: application/manifest+json`을 붙인다.

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