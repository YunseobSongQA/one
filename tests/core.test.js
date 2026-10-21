import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, habitProgress, weekKey } from '../src/core/logic.js';
import * as seed from '../src/seed.js';

// 2026-10-21은 수요일
const WED = new Date(2026, 9, 21, 12, 0);
const logsOn = (key, ...days) => Object.fromEntries(days.map((d) => [d, [key]]));

test('seed 파싱: 차트 2개, 테마 8개, 칸 8개씩', () => {
  const { charts } = createState(seed);
  assert.deepEqual(charts.map((c) => c.id), ['life', 'career']);
  for (const chart of charts) {
    assert.equal(chart.themes.length, 8);
    for (const theme of chart.themes) assert.equal(theme.items.length, 8);
  }
});

test('seed 파싱: 목표, 습관 표기, 상위 경로', () => {
  const [life, career] = createState(seed).charts;
  assert.equal(life.goal, '자연스럽게 평화를 지키는 사람');
  assert.equal(career.goal, '금융·핀테크 QE/SDET 스카우트 1순위');
  assert.deepEqual(life.themes[0].items[1], {
    id: 'life-0-1', text: '주 3회 운동', kind: 'habit', freq: { type: 'weekly', count: 3 }, slot: 'home', habitKey: '주 3회 운동', done: false,
  });
  assert.equal(life.themes[0].items[4].kind, 'value');
  assert.deepEqual(career.themes[7].items[6].freq, { type: 'monthly', count: 2 });
  assert.equal(life.parent, null);
  assert.deepEqual(career.parent, { chart: 'life', theme: 'life-1', item: 'life-1-6' });
  assert.equal(life.themes[1].title, '생산활동');
  assert.equal(life.themes[1].items[6].text, '커리어 만다라트');
});

test('ISO 주 키', () => {
  assert.equal(weekKey(WED), '2026-W43');
  assert.equal(weekKey(new Date(2026, 0, 1)), '2026-W01');
  assert.equal(weekKey(new Date(2021, 0, 1)), '2020-W53');
  assert.equal(weekKey(new Date(2024, 11, 30)), '2025-W01');
});

test('달성률 daily: 이번 주 체크한 날 / 지난 날', () => {
  const logs = logsOn('k', '2026-10-19', '2026-10-21', '2026-10-18');
  assert.deepEqual(habitProgress({ type: 'daily', count: 1 }, 'k', logs, WED), { done: 2, total: 3, rate: 2 / 3 });
});

test('달성률 weekdays: 체크한 평일 / 지난 평일', () => {
  const sat = new Date(2026, 9, 24);
  const logs = logsOn('k', '2026-10-19', '2026-10-20', '2026-10-24');
  assert.deepEqual(habitProgress({ type: 'weekdays', count: 1 }, 'k', logs, sat), { done: 2, total: 5, rate: 0.4 });
  assert.equal(habitProgress({ type: 'weekdays', count: 1 }, 'k', logs, WED).total, 3);
});

test('달성률 weekly N: 이번 ISO 주 체크 수 / N', () => {
  const logs = logsOn('k', '2026-10-18', '2026-10-19', '2026-10-25');
  assert.deepEqual(habitProgress({ type: 'weekly', count: 3 }, 'k', logs, WED), { done: 2, total: 3, rate: 2 / 3 });
});

test('달성률 monthly N: 이번 달 체크 수 / N', () => {
  const logs = logsOn('k', '2026-09-30', '2026-10-01', '2026-10-31');
  assert.deepEqual(habitProgress({ type: 'monthly', count: 4 }, 'k', logs, WED), { done: 2, total: 4, rate: 0.5 });
});

test('달성률은 1로 자른다', () => {
  const logs = logsOn('k', '2026-10-19', '2026-10-20', '2026-10-21');
  assert.deepEqual(habitProgress({ type: 'weekly', count: 2 }, 'k', logs, WED), { done: 3, total: 2, rate: 1 });
  assert.equal(habitProgress({ type: 'monthly', count: 1 }, 'k', logs, WED).rate, 1);
});
