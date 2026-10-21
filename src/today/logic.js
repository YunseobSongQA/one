// 오늘 화면: 모드 판정, 습관 병합·필터, 체크

import { isWeekend } from '../core/logic.js';

const minutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// 규칙은 DESIGN.md "모드 판정 규칙" 참고
export function getMode(date, { workDays, workStart, workEnd, commuteMinutes }) {
  const now = date.getHours() * 60 + date.getMinutes();
  const start = minutes(workStart);
  const end = minutes(workEnd);
  if (workDays.includes(date.getDay())) {
    if (start <= now && now < end) return 'work';
    if ((start - commuteMinutes <= now && now < start) || (end <= now && now < end + commuteMinutes)) return 'commute';
  }
  return isWeekend(date) ? 'weekend' : 'home';
}

// habitKey가 같은 습관을 하나로 합친다. 텍스트·빈도·시간대는 먼저 나온 칸을 따른다.
// career: 하위 차트(커리어)에만 있는 습관
export function collectHabits(charts) {
  const habits = new Map();
  for (const chart of charts) {
    for (const item of chart.themes.flatMap((t) => t.items)) {
      if (item.kind !== 'habit') continue;
      const habit = habits.get(item.habitKey);
      if (habit) habit.career &&= Boolean(chart.parent);
      else habits.set(item.habitKey, { key: item.habitKey, text: item.text, freq: item.freq, slot: item.slot, career: Boolean(chart.parent) });
    }
  }
  return [...habits.values()];
}

// 지금 모드에 맞는 습관만. 가정 모드에서는 커리어 습관을 숨긴다.
export function visibleHabits(habits, mode, showAll) {
  if (showAll) return habits;
  return habits.filter((h) => (h.slot === mode || h.slot === 'any') && !(mode === 'home' && h.career));
}

export function toggleLog(state, key, day) {
  const next = structuredClone(state);
  const keys = new Set(next.logs[day]);
  if (keys.has(key)) keys.delete(key);
  else keys.add(key);
  if (keys.size) next.logs[day] = [...keys];
  else delete next.logs[day];
  return next;
}
