import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, habitProgress } from '../src/core/logic.js';
import * as seed from '../src/seed.js';
import { collectHabits, toggleLog } from '../src/today/logic.js';
import { cellAt, emptyChart, setCell, wrapLines } from '../src/mandalart/logic.js';

const life = (state) => state.charts.find((c) => c.id === 'life');
const cells = (chart) => [...Array(9).keys()].flatMap((b) => [...Array(9).keys()].map((c) => cellAt(chart, b, c)));

test('격자: 중앙 가운데는 목표, 중앙 칸과 바깥 블록 가운데는 같은 테마', () => {
  const chart = life(createState(seed));
  assert.equal(cellAt(chart, 4, 4).text, '자연스럽게 평화를 지키는 사람');
  assert.equal(cellAt(chart, 4, 1).text, '생산활동');
  assert.equal(cellAt(chart, 1, 4).text, '생산활동');
  assert.equal(cellAt(chart, 1, 7).text, '커리어 만다라트'); // 상 블록의 하단 가운데
  assert.equal(cellAt(chart, 8, 8).text, '기부 기록');
  assert.equal(cells(chart).length, 81);
});

test('화살표: 바깥 블록마다 중앙과 맞닿은 칸 하나', () => {
  const chart = life(createState(seed));
  const arrows = cells(chart).filter((cell) => cell.arrow).map((cell) => cell.arrow);
  assert.equal(arrows.length, 8);
  assert.deepEqual(cellAt(chart, 0, 8).arrow, ['diag', 0]);
  assert.deepEqual(cellAt(chart, 5, 3).arrow, ['line', 90]);
  assert.deepEqual(cellAt(chart, 8, 0).arrow, ['diag', 180]);
});

test('테마 이름을 고치면 중앙 블록과 바깥 블록 가운데 칸에 같은 값이 나온다', () => {
  let state = setCell(createState(seed), 'life', 4, 0, { text: '건강' });
  assert.equal(cellAt(life(state), 4, 0).text, '건강');
  assert.equal(cellAt(life(state), 0, 4).text, '건강');
  state = setCell(state, 'life', 0, 4, { text: '  몸과 건강 ' });
  assert.equal(cellAt(life(state), 4, 0).text, '몸과 건강');
  assert.equal(cellAt(life(state), 0, 4).text, '몸과 건강');
});

test('습관 칸의 텍스트를 고쳐도 기존 기록과 달성률이 유지된다', () => {
  const now = new Date(2026, 9, 21);
  let state = createState(seed);
  state = toggleLog(state, '수면 7시간', '2026-10-19');
  state = toggleLog(state, '수면 7시간', '2026-10-20');
  const item = () => life(state).themes[0].items[0];
  const before = habitProgress(item().freq, item().habitKey, state.logs, now);

  state = setCell(state, 'life', 0, 0, { text: '수면 7시간 이상', kind: 'habit', freq: item().freq, slot: 'home' });
  assert.equal(item().text, '수면 7시간 이상');
  assert.equal(item().habitKey, '수면 7시간');
  assert.deepEqual(habitProgress(item().freq, item().habitKey, state.logs, now), before);
  assert.deepEqual(before, { done: 2, total: 3, rate: 2 / 3 });
  assert.equal(collectHabits(state.charts).filter((h) => h.key === '수면 7시간').length, 1);
});

test('칸을 습관으로 지정하면 정리한 텍스트가 habitKey가 되고, 비우면 기본 칸으로 돌아간다', () => {
  // 좌상 블록의 격자 위치 5 = 배열 순서 4 = '바른 자세'
  let state = setCell(createState(seed), 'life', 0, 5, { text: '  바른   자세 ', kind: 'habit', freq: { type: 'weekly', count: 2 }, slot: 'any' });
  const item = () => life(state).themes[0].items[4];
  assert.equal(item().habitKey, '바른 자세');
  assert.deepEqual(item().freq, { type: 'weekly', count: 2 });
  state = setCell(state, 'life', 0, 5, { text: '' });
  assert.deepEqual(item(), { id: 'life-0-4', text: '', kind: 'value', freq: { type: 'daily', count: 1 }, slot: 'any', habitKey: null, done: false });
});

test("'빈 차트로 시작' 후 그 차트의 81칸이 모두 비고 다른 차트는 그대로다", () => {
  const state = createState(seed);
  const emptied = emptyChart(state, 'life');
  assert.ok(cells(life(emptied)).every((cell) => cell.text === ''));
  assert.deepEqual(emptied.charts[1], state.charts[1]);
  assert.deepEqual(life(emptied).themes.map((t) => t.id), life(state).themes.map((t) => t.id));
  assert.equal(life(state).goal, '자연스럽게 평화를 지키는 사람'); // 원본은 바뀌지 않는다
});

test('줄바꿈: 공백과 슬래시 뒤에서 끊고, 긴 단어는 아무 데서나 끊는다', () => {
  const measure = (text) => text.length; // 글자 수를 폭으로 친다
  assert.deepEqual(wrapLines('AGILE/SCRUM 실무 적용', 6, measure), ['AGILE/', 'SCRUM', '실무 적용']);
  assert.deepEqual(wrapLines('머리는 차갑게', 7, measure), ['머리는 차갑게']);
  assert.deepEqual(wrapLines('스카우트1순위', 4, measure), ['스카우트', '1순위']);
  assert.deepEqual(wrapLines('', 4, measure), []);
});
