import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/core/logic.js';
import * as seed from '../src/seed.js';
import { collectHabits, getMode, toggleLog, visibleHabits } from '../src/today/logic.js';

const settings = seed.settings; // 월~금 09:00~18:00, 출퇴근 60분
const at = (day, hh, mm) => new Date(2026, 9, day, hh, mm); // 2026-10-19(월) ~ 10-25(일)

test('모드: 근무 시작 정각과 종료 정각', () => {
  assert.equal(getMode(at(21, 9, 0), settings), 'work');
  assert.equal(getMode(at(21, 8, 59), settings), 'commute');
  assert.equal(getMode(at(21, 17, 59), settings), 'work');
  assert.equal(getMode(at(21, 18, 0), settings), 'commute');
});

test('모드: 출퇴근 구간 경계', () => {
  assert.equal(getMode(at(21, 7, 59), settings), 'home');
  assert.equal(getMode(at(21, 8, 0), settings), 'commute');
  assert.equal(getMode(at(21, 18, 59), settings), 'commute');
  assert.equal(getMode(at(21, 19, 0), settings), 'home');
  assert.equal(getMode(at(21, 9, 30), { ...settings, commuteMinutes: 30 }), 'work');
  assert.equal(getMode(at(21, 8, 29), { ...settings, commuteMinutes: 30 }), 'home');
  assert.equal(getMode(at(21, 8, 30), { ...settings, commuteMinutes: 30 }), 'commute');
});

test('모드: 주말', () => {
  assert.equal(getMode(at(24, 10, 0), settings), 'weekend');
  assert.equal(getMode(at(25, 8, 30), settings), 'weekend');
});

test('모드: 근무 요일이 아닌 평일은 가정', () => {
  const fourDays = { ...settings, workDays: [1, 2, 3, 4] };
  assert.equal(getMode(at(23, 10, 0), fourDays), 'home');
  assert.equal(getMode(at(23, 8, 30), fourDays), 'home');
});

test('같은 텍스트의 습관은 하나로 합친다', () => {
  const habits = collectHabits(createState(seed).charts);
  const keys = habits.map((h) => h.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const shared of ['수면 7시간', '주 3회 운동', '영양제 먹기']) {
    assert.equal(keys.filter((k) => k === shared).length, 1);
    assert.equal(habits.find((h) => h.key === shared).career, false);
  }
  assert.equal(habits.find((h) => h.key === '현직자 커피챗').career, true);
});

test('체크는 habitKey로 공유된다', () => {
  let state = createState(seed);
  state = toggleLog(state, '수면 7시간', '2026-10-21');
  assert.deepEqual(state.logs['2026-10-21'], ['수면 7시간']);
  state = toggleLog(state, '수면 7시간', '2026-10-21');
  assert.equal(state.logs['2026-10-21'], undefined);
});

test('모드별 습관 필터: 가정에서는 커리어 습관을 숨긴다', () => {
  const habits = collectHabits(createState(seed).charts);
  const home = visibleHabits(habits, 'home', false).map((h) => h.key);
  assert.ok(home.includes('감사 일기') && home.includes('영양제 먹기'));
  assert.ok(!home.includes('현직자 커피챗'));
  assert.ok(!home.includes('근무 시간 최대 효율'));
  const work = visibleHabits(habits, 'work', false).map((h) => h.key);
  assert.ok(work.includes('근무 시간 최대 효율') && work.includes('현직자 커피챗'));
  assert.ok(!work.includes('감사 일기'));
  assert.equal(visibleHabits(habits, 'home', true).length, habits.length);
});
