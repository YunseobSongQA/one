// 기기 간 동기화 흐름. 앱을 열 때 서버와 비교하고, 바꾼 뒤 60초 동안 더 바뀌지 않으면 서버에 올린다.

import * as storage from '../core/storage.js';
import { syncDirection } from './logic.js';

const DELAY = 60_000;
let timer = null;
let running = null; // 진행 중인 비교 (겹쳐서 확인 창이 두 번 뜨지 않게)
let status = '';

export const getToken = storage.loadToken;
export const setToken = (token) => storage.saveToken(token.trim());
export const syncStatus = () => status;

// 서버와 비교해 최신을 따른다. 서버가 더 최신이면 덮어쓰기 전에 확인을 받는다.
export function syncNow(ctx) {
  if (!getToken()) {
    status = '';
    return Promise.resolve();
  }
  running ??= track(compare(ctx)).finally(() => {
    running = null;
  });
  return running;
}

export function schedule(ctx) {
  if (!getToken()) return;
  clearTimeout(timer);
  timer = setTimeout(() => track(push(ctx)), DELAY);
}

// 앱을 떠날 때 기다리던 업로드가 있으면 바로 보낸다.
export function flush(ctx) {
  if (timer) track(push(ctx));
}

async function compare(ctx) {
  const remote = await storage.loadRemote(getToken());
  const direction = syncDirection(ctx.state, remote);
  if (direction === 'push') await push(ctx);
  if (direction === 'pull' && confirm(pullMessage(remote))) {
    clearTimeout(timer);
    timer = null;
    ctx.replace(remote);
  }
}

function push(ctx) {
  clearTimeout(timer);
  timer = null;
  return storage.saveRemote(getToken(), ctx.state);
}

const pullMessage = (remote) =>
  `서버에 더 최신 데이터가 있어요 (${new Date(remote.updatedAt).toLocaleString('ko-KR')}).\n` +
  '이 기기의 데이터를 서버 데이터로 바꿀까요?\n취소하면 이 기기 데이터를 그대로 두고, 다음에 바꿀 때 서버에 올려요.';

// 결과를 설정 화면에 보여 줄 문구로 남긴다.
async function track(task) {
  try {
    await task;
    status = `마지막 동기화 ${new Date().toLocaleTimeString('ko-KR')}`;
  } catch (error) {
    status = `동기화 실패: ${error.message}`;
  }
}
