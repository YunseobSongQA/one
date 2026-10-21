import { createState } from './core/logic.js';
import * as storage from './core/storage.js';
import * as seed from './seed.js';
import * as today from './today/view.js';
import * as mandalart from './mandalart/view.js';
import * as review from './review/view.js';
import * as settings from './settings/view.js';
import * as sync from './sync/view.js';

const views = { today, mandalart, review, settings };
const header = document.querySelector('#top');
const main = document.querySelector('#view');
const tabs = document.querySelector('#tabs');
const sheet = document.querySelector('#sheet');

let state = storage.load() ?? createState(seed);
let tab = 'today';

// 각 화면에 넘기는 인터페이스. 상태 변경은 모두 update(각 기능 logic.js의 순수 함수)로 한다.
const ctx = {
  get state() {
    return state;
  },
  update(change, { render: rerender = true } = {}) {
    state = { ...change(state), updatedAt: new Date().toISOString() };
    storage.save(state);
    sync.schedule(ctx);
    if (rerender) render();
  },
  // 동기화로 받은 state를 그대로 쓴다(updatedAt 유지).
  replace(next) {
    state = next;
    storage.save(state);
    render();
  },
  render,
};

function render() {
  for (const button of tabs.querySelectorAll('[data-tab]')) button.ariaCurrent = button.dataset.tab === tab ? 'page' : null;
  main.className = '';
  views[tab].render({ header, main }, ctx);
}

tabs.onclick = (e) => {
  const button = e.target.closest('[data-tab]');
  if (!button) return;
  tab = button.dataset.tab;
  main.scrollTop = 0;
  render();
};

// 시트 바깥(배경)을 누르면 닫는다.
sheet.onclick = (e) => {
  if (e.target === sheet) sheet.close();
};

// 모드는 시각에 따라 바뀌므로 오늘 화면은 1분마다, 앱으로 돌아올 때마다 다시 그린다.
const refreshToday = () => {
  if (tab === 'today' && !document.hidden) render();
};
setInterval(refreshToday, 60_000);

// 앱으로 돌아오면 서버와 맞추고, 떠날 때는 기다리던 업로드를 바로 보낸다.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return sync.flush(ctx);
  refreshToday();
  sync.syncNow(ctx);
});

// 서비스 워커: 새 버전이 설치되면 배너를 띄우고, 탭하면 적용해서 다시 연다.
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.register('sw.js');
  const banner = document.querySelector('#update');
  const offer = (worker) => {
    banner.hidden = false;
    banner.onclick = () => worker.postMessage('skipWaiting');
  };
  if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
  registration.onupdatefound = () => {
    const worker = registration.installing;
    worker.onstatechange = () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
    };
  };
  navigator.serviceWorker.oncontrollerchange = () => location.reload();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) registration.update().catch(() => {}); // 오프라인이면 다음에 다시 확인
  });
}

storage.requestPersist();
render();
registerServiceWorker();
sync.syncNow(ctx);
