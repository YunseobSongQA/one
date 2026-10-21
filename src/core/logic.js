// 여러 기능이 함께 쓰는 순수 함수: state 생성, seed 파싱, 날짜, 달성률

export const SLOTS = { work: '근무', commute: '출퇴근', home: '가정', weekend: '주말', any: '언제나' };
export const FREQS = { daily: '매일', weekdays: '평일', weekly: '주', monthly: '월' };

export const freqLabel = ({ type, count }) => (type === 'weekly' || type === 'monthly' ? `${FREQS[type]} ${count}회` : FREQS[type]);

// ── state ──

export function createState(seed) {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(), // 아직 고친 적 없는 state는 가장 오래된 것으로 친다(동기화 기준)
    settings: structuredClone(seed.settings),
    charts: parseCharts(seed.charts),
    logs: {},
    reviews: {},
  };
}

export function newItem(id, fields = {}) {
  return { id, text: '', kind: 'value', freq: { type: 'daily', count: 1 }, slot: 'any', habitKey: null, done: false, ...fields };
}

export const toHabitKey = (text) => text.trim().replace(/\s+/g, ' ');

// ── seed 파싱 ──

export function parseCharts(text) {
  const charts = [];
  const parentPaths = [];
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const head = line.match(/^\[(\w+) (.+?)\] 중심: (.*?)(?: \(상위: (.+)\))?$/);
    const theme = line.match(/^- (.+?): (.+)$/);
    if (head) {
      const [, id, title, goal, parent] = head;
      charts.push({ id, title, goal, parent: null, themes: [] });
      if (parent) parentPaths.push([charts.at(-1), parent.split(' › ')]);
    } else if (theme && charts.length) {
      const chart = charts.at(-1);
      const id = `${chart.id}-${chart.themes.length}`;
      chart.themes.push({ id, title: theme[1], items: theme[2].split(' | ').map((cell, i) => parseItem(`${id}-${i}`, cell)) });
    } else {
      throw new Error(`seed 형식 오류: ${line}`);
    }
  }
  for (const chart of charts) {
    if (chart.themes.length !== 8 || chart.themes.some((t) => t.items.length !== 8)) {
      throw new Error(`seed: ${chart.title} 차트는 테마 8개, 칸 8개씩이어야 합니다.`);
    }
  }
  for (const [chart, [chartTitle, themeTitle, itemText]] of parentPaths) {
    const parent = charts.find((c) => c.title === chartTitle);
    const theme = parent?.themes.find((t) => t.title === themeTitle);
    const item = theme?.items.find((i) => i.text === itemText);
    if (!theme || (itemText && !item)) throw new Error(`seed: ${chart.title} 차트의 상위 경로를 찾을 수 없습니다.`);
    chart.parent = { chart: parent.id, theme: theme.id, item: item?.id ?? null };
  }
  return charts;
}

// "수면 7시간{매일·가정}" → 습관, 표기가 없으면 값
function parseItem(id, cell) {
  const habit = cell.match(/^(.*)\{(.+)·(.+)\}$/);
  if (!habit) return newItem(id, { text: cell });
  const [, text, freq, slot] = habit;
  return newItem(id, {
    text: text.trim(),
    kind: 'habit',
    freq: { type: keyOf(FREQS, freq.replace(/\d+$/, '')), count: Number(freq.match(/\d+$/)?.[0] ?? 1) },
    slot: keyOf(SLOTS, slot),
    habitKey: toHabitKey(text),
  });
}

function keyOf(labels, label) {
  const key = Object.keys(labels).find((k) => labels[k] === label);
  if (!key) throw new Error(`seed: 알 수 없는 표기 '${label}'`);
  return key;
}

// ── 날짜 (모두 로컬 시각) ──

const DAY = 24 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');

export const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
export const weekday = (date) => (date.getDay() + 6) % 7; // 월 0 … 일 6
export const startOfWeek = (date) => addDays(date, -weekday(date)); // ISO 주는 월요일에 시작
export const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;
export const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// ISO 주 "YYYY-Www". 주의 연도는 그 주 목요일이 속한 해다.
export function weekKey(date) {
  const thursday = addDays(startOfWeek(date), 3);
  const dayOfYear = Math.round((thursday - new Date(thursday.getFullYear(), 0, 1)) / DAY);
  return `${thursday.getFullYear()}-W${pad(Math.floor(dayOfYear / 7) + 1)}`;
}

const days = (from, count) => Array.from({ length: count }, (_, i) => addDays(from, i));

// ── 달성률 ──

// 이번 기간 달성 현황. rate는 최대 1로 자른다.
export function habitProgress(freq, key, logs, now) {
  const checked = (dates) => dates.filter((d) => logs[dateKey(d)]?.includes(key)).length;
  const [done, total] = tally(freq, checked, now);
  return { done, total, rate: Math.min(1, done / total) };
}

function tally({ type, count }, checked, now) {
  const week = days(startOfWeek(now), 7);
  const sofar = week.slice(0, weekday(now) + 1); // 이번 주 월요일~오늘
  if (type === 'daily') return [checked(sofar), sofar.length];
  if (type === 'weekdays') {
    const weekdays = sofar.filter((d) => !isWeekend(d));
    return [checked(weekdays), weekdays.length];
  }
  if (type === 'weekly') return [checked(week), count];
  const monthLength = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return [checked(days(new Date(now.getFullYear(), now.getMonth(), 1), monthLength)), count]; // monthly
}
