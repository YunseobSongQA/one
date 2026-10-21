// 저장소 접근은 이 파일에서만 한다.

const KEY = 'mandalart:v1';
const TOKEN_KEY = 'mandalart:token'; // 기기별 동기화 토큰. 백업·동기화 대상이 아니라 state와 따로 둔다.

export function load() {
  const saved = localStorage.getItem(KEY);
  return saved ? JSON.parse(saved) : null;
}

export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

// 브라우저가 저장 공간을 임의로 비우지 않도록 요청한다.
export function requestPersist() {
  navigator.storage?.persist?.();
}

// ── 동기화 서버 (functions/api/state.js) ──

export const loadToken = () => localStorage.getItem(TOKEN_KEY) ?? '';

export function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// 서버의 state. 아직 올린 적이 없으면 null
export async function loadRemote(token) {
  const response = await fetch('api/state', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error(`서버 응답 ${response.status}`);
  return response.json();
}

export async function saveRemote(token, state) {
  const response = await fetch('api/state', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!response.ok) throw new Error(`서버 응답 ${response.status}`);
}
