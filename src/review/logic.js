// 회고: 블록별 달성률, 회고 저장

import { habitProgress } from '../core/logic.js';

// 차트마다 블록(테마)별 습관 달성률 평균. 습관이 없는 블록은 rate가 null이다.
export function blockRates(charts, logs, now) {
  return charts.map((chart) => ({
    title: chart.title,
    blocks: chart.themes.map((theme) => {
      const rates = theme.items.filter((i) => i.kind === 'habit').map((i) => habitProgress(i.freq, i.habitKey, logs, now).rate);
      return { title: theme.title, rate: rates.length ? rates.reduce((a, b) => a + b) / rates.length : null };
    }),
  }));
}

export function setReview(state, week, field, text) {
  const next = structuredClone(state);
  next.reviews[week] = { good: '', bad: '', next: '', ...next.reviews[week], [field]: text };
  return next;
}
