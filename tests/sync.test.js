import test from 'node:test';
import assert from 'node:assert/strict';
import { syncDirection } from '../src/sync/logic.js';
import { onRequestGet, onRequestPut } from '../functions/api/state.js';

const at = (updatedAt) => ({ version: 1, updatedAt });

test('동기화 방향: updatedAt이 최신인 쪽을 따른다', () => {
  assert.equal(syncDirection(at('2026-10-21T01:00:00.000Z'), null), 'push');
  assert.equal(syncDirection(at('2026-10-21T01:00:00.000Z'), at('2026-10-21T00:00:00.000Z')), 'push');
  assert.equal(syncDirection(at('2026-10-21T01:00:00.000Z'), at('2026-10-21T02:00:00.000Z')), 'pull');
  assert.equal(syncDirection(at('2026-10-21T01:00:00.000Z'), at('2026-10-21T01:00:00.000Z')), 'none');
  assert.equal(syncDirection(at(new Date(0).toISOString()), at('2026-10-21T00:00:00.000Z')), 'pull'); // seed 그대로인 새 기기
});

// KV는 get/put만 쓰는지 확인할 수 있게 흉내 낸다.
const fakeKV = () => {
  const store = new Map();
  return { get: async (key) => store.get(key) ?? null, put: async (key, value) => void store.set(key, value) };
};
const call = (handler, env, { token = 'secret', method = 'GET', body } = {}) =>
  handler({ env, request: new Request('https://example.com/api/state', { method, body, headers: token ? { Authorization: `Bearer ${token}` } : {} }) });

test('서버: 토큰이 없거나 틀리면 401, 설정이 없으면 503', async () => {
  const env = { SYNC_TOKEN: 'secret', SYNC_KV: fakeKV() };
  assert.equal((await call(onRequestGet, env, { token: '' })).status, 401);
  assert.equal((await call(onRequestGet, env, { token: 'wrong' })).status, 401);
  assert.equal((await call(onRequestGet, { SYNC_KV: fakeKV() }, { token: 'undefined' })).status, 503);
});

test('서버: PUT한 state를 GET으로 돌려준다', async () => {
  const env = { SYNC_TOKEN: 'secret', SYNC_KV: fakeKV() };
  assert.equal(await (await call(onRequestGet, env)).json(), null);
  const state = JSON.stringify(at('2026-10-21T01:00:00.000Z'));
  assert.equal((await call(onRequestPut, env, { method: 'PUT', body: state })).status, 204);
  assert.deepEqual(await (await call(onRequestGet, env)).json(), JSON.parse(state));
  assert.equal((await call(onRequestPut, env, { method: 'PUT', body: '{"x":1}' })).status, 400);
  assert.equal((await call(onRequestPut, env, { method: 'PUT', body: 'not json' })).status, 400);
});
