# CLAUDE.md

만다라트 관리 PWA. 작업 지시서 원문은 prompt.txt, 설계는 DESIGN.md를 따른다.

## 대화와 코드
- 모든 대화는 한국어로 한다.
- 코드는 유지보수하기 쉽게 깔끔하고 심플하게 쓴다.

## 작업 규칙 (항상 지킬 것)
- Vanilla JS(ES 모듈)만 쓴다. 프레임워크, 번들러, 빌드 단계, 런타임 npm 의존성을 쓰지 않는다.
- 폴더는 기능별로 나눈다. 각 기능은 logic.js(순수 함수)와 view.js(DOM)로 나누고, 저장소 접근은 src/core/storage.js 한 곳에서만 한다.
- 데이터 주도로 만든다. 만다라트 내용과 설정은 코드에 하드코딩하지 않고 seed 데이터(src/seed.js)에서 읽는다.
- 파일 수는 최소로 한다. 같은 코드가 두 번째로 중복되기 전에는 추상화하지 않는다.
- 기존 파일은 필요한 부분만 diff로 고친다. 파일 전체를 다시 쓰지 않는다.
- UI 문구는 한국어로 쓴다.
- git 커밋 메시지에 Claude나 AI 서명(Co-Authored-By 등)을 넣지 않는다.
- 단계가 끝날 때마다 멈추고 보고한다. 보고는 바뀐 파일 목록과 확인 방법만 10줄 이내로 쓴다. 사용자는 아이폰으로 확인한다.
- 앱 파일(index.html, manifest.webmanifest, src/, icons/)을 바꿀 때마다 sw.js의 CACHE_VERSION을 올린다. 파일을 추가·삭제하면 sw.js의 SHELL 목록도 고친다.

## 진행 단계
0 설계(DESIGN.md) → 1 기능·테스트 → 2 PWA·배포 준비 → 3 동기화(요청할 때만)

## 확인 방법
- 테스트: `node --test`
- 로컬: `python3 -m http.server 8080` → `gh codespace ports visibility 8080:public -c $CODESPACE_NAME` → 아이폰 Safari로 연다.

## 교정 기록
<!-- 사용자가 교정한 내용을 한 줄씩 추가한다. 같은 실수를 반복하지 않는다. -->
