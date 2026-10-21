// 만다라트: 격자 위치 ↔ 데이터 매핑, 칸 편집, 빈 차트, 화살표, 줄바꿈

import { newItem, toHabitKey } from '../core/logic.js';

// 위쪽(line)·좌상(diag)을 가리키는 화살표. style.css의 .arrow 배경과 같은 모양이다.
export const ARROW_PATHS = {
  line: 'M50 4 L92 48 L64 48 L64 100 L36 100 L36 48 L8 48 Z',
  diag: 'M3 3 L64 8 L44 24 L120 100 L100 120 L24 44 L8 64 Z',
};

// 블록 위치 → [모양, 시계 방향 회전 각도]. 화살표는 중앙에서 바깥 블록 중심을 향한다.
const ARROWS = { 0: ['diag', 0], 1: ['line', 0], 2: ['diag', 90], 3: ['line', 270], 5: ['line', 90], 6: ['diag', 270], 7: ['line', 180], 8: ['diag', 180] };

// 격자 위치(0~8, 행 우선, 가운데 4) ↔ 배열 순서(0~7)
export const toIndex = (pos) => (pos < 4 ? pos : pos - 1);
export const toPos = (index) => (index < 4 ? index : index + 1);

// 블록·칸 위치가 가리키는 데이터
export function locate(block, cell) {
  if (block === 4) return cell === 4 ? { kind: 'goal' } : { kind: 'theme', theme: toIndex(cell) };
  return cell === 4 ? { kind: 'theme', theme: toIndex(block) } : { kind: 'item', theme: toIndex(block), item: toIndex(cell) };
}

export function cellAt(chart, block, cell) {
  const pos = locate(block, cell);
  const theme = chart.themes[pos.theme];
  const item = pos.kind === 'item' ? theme.items[pos.item] : null;
  return {
    ...pos,
    item,
    text: pos.kind === 'goal' ? chart.goal : pos.kind === 'theme' ? theme.title : item.text,
    arrow: block !== 4 && cell === 8 - block ? ARROWS[block] : null, // 중앙 블록과 맞닿은 칸
  };
}

// 칸에 그릴 글자. 완료한 할 일은 앞에 ✓를 붙인다.
export const displayText = (cell) => (cell.item?.kind === 'task' && cell.item.done ? `✓ ${cell.text}` : cell.text);

// 칸 id → 그 칸에서 이동할 하위 차트 id
export const childLinks = (charts) => Object.fromEntries(charts.filter((c) => c.parent?.item).map((c) => [c.parent.item, c.id]));

// 목표·테마·칸 어느 것이든 위치로 고친다. 테마 이름은 theme.title 하나라 중앙·바깥 블록에 함께 반영된다.
export function setCell(state, chartId, block, cell, fields) {
  const next = structuredClone(state);
  const chart = next.charts.find((c) => c.id === chartId);
  const pos = locate(block, cell);
  const text = fields.text.trim();
  if (pos.kind === 'goal') chart.goal = text;
  else if (pos.kind === 'theme') chart.themes[pos.theme].title = text;
  else {
    const items = chart.themes[pos.theme].items;
    items[pos.item] = editItem(items[pos.item], { ...fields, text });
  }
  return next;
}

function editItem(item, { text, kind = item.kind, freq = item.freq, slot = item.slot, done = item.done }) {
  if (!text) return newItem(item.id); // 비우면 기본 칸으로 돌아간다
  return {
    ...item,
    text,
    kind,
    freq: { type: freq.type, count: Math.max(1, Math.round(freq.count) || 1) },
    slot,
    done: kind === 'task' && done,
    habitKey: item.habitKey ?? (kind === 'habit' ? toHabitKey(text) : null), // 한 번 정하면 텍스트를 고쳐도 유지
  };
}

// 목표·테마·칸을 모두 비운다. 기록(logs)과 다른 차트는 그대로 둔다.
export function emptyChart(state, chartId) {
  const next = structuredClone(state);
  const chart = next.charts.find((c) => c.id === chartId);
  chart.goal = '';
  for (const theme of chart.themes) {
    theme.title = '';
    theme.items = theme.items.map((item) => newItem(item.id));
  }
  return next;
}

// canvas용 줄바꿈. CSS의 word-break: keep-all, overflow-wrap: anywhere, 슬래시 뒤 <wbr>과 같게 끊는다.
export function wrapLines(text, maxWidth, measure) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    for (const [i, part] of word.match(/[^/]*\/|[^/]+/g).entries()) {
      const joined = i === 0 ? `${line} ${part}` : line + part;
      if (line && measure(joined) <= maxWidth) {
        line = joined;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const ch of part) {
        if (line && measure(line + ch) > maxWidth) {
          lines.push(line);
          line = '';
        }
        line += ch;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}
