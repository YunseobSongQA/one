import { createState } from './core/logic.js';
import * as storage from './core/storage.js';
import * as seed from './seed.js';
import * as today from './today/view.js';
import * as mandalart from './mandalart/view.js';
import * as review from './review/view.js';
import * as settings from './settings/view.js';

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
    if (rerender) render();
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
document.addEventListener('visibilitychange', refreshToday);
setInterval(refreshToday, 60_000);

storage.requestPersist();
render();
