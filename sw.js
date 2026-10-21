// 앱 셸을 캐시해서 오프라인에서도 열리게 한다.
// 앱 파일을 바꿀 때마다 CACHE_VERSION을 올리고, 파일을 추가·삭제하면 SHELL도 고친다(CLAUDE.md 규칙).
const CACHE_VERSION = 2;
const CACHE = `mandalart-v${CACHE_VERSION}`;
const SHELL = [
  './',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'src/app.js',
  'src/style.css',
  'src/seed.js',
  'src/core/logic.js',
  'src/core/storage.js',
  'src/core/view.js',
  'src/today/logic.js',
  'src/today/view.js',
  'src/mandalart/logic.js',
  'src/mandalart/view.js',
  'src/review/logic.js',
  'src/review/view.js',
  'src/settings/logic.js',
  'src/settings/view.js',
  'src/sync/logic.js',
  'src/sync/view.js',
];

self.addEventListener('install', (event) => {
  // HTTP 캐시를 거치지 않고 새로 받아 둔다. 바로 활성화하지 않고 화면의 배너를 기다린다.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
});

// "새 버전이 있어요 · 탭해서 적용" 배너를 누르면 대기 중인 새 버전으로 바꾼다.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// 페이지 이동은 앱 셸로, 나머지는 캐시에 있으면 캐시에서 준다.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(request.mode === 'navigate' ? './' : request))
      .then((cached) => cached ?? fetch(request)),
  );
});
