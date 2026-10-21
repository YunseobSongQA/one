import { SLOTS, dateKey, freqLabel, habitProgress } from '../core/logic.js';
import { esc, toggle } from '../core/view.js';
import { collectHabits, getMode, toggleLog, visibleHabits } from './logic.js';

let showAll = false;

export function render({ header, main }, ctx) {
  const { settings, charts, logs } = ctx.state;
  const now = new Date();
  const mode = getMode(now, settings);
  const checked = logs[dateKey(now)] ?? [];
  const habits = visibleHabits(collectHabits(charts), mode, showAll);

  header.innerHTML = `
    <p class="sub">${now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
    <h1 class="mode-title"><span class="mode ${mode}">${SLOTS[mode]}</span> 모드</h1>
    <p class="principle">${esc(settings.principle)}</p>`;

  main.innerHTML = `
    <div class="section-head"><h2>습관</h2>${toggle('show-all', '전체 보기', showAll)}</div>
    ${habits.length
      ? `<ul class="list">${habits.map((h) => habitRow(h, checked.includes(h.key), habitProgress(h.freq, h.key, logs, now))).join('')}</ul>`
      : '<p class="empty">지금 할 습관이 없어요.</p>'}`;

  main.querySelector('#show-all').onchange = (e) => {
    showAll = e.target.checked;
    ctx.render();
  };
  for (const button of main.querySelectorAll('[data-key]')) {
    button.onclick = () => ctx.update((s) => toggleLog(s, button.dataset.key, dateKey(new Date())));
  }
}

const habitRow = (habit, checked, { done, total }) => `
  <li><button class="habit" data-key="${esc(habit.key)}" aria-pressed="${checked}">
    <span class="check"></span>
    <span class="name">${esc(habit.text)}<small>${freqLabel(habit.freq)} · ${SLOTS[habit.slot]}</small></span>
    <span class="count">${done}/${total}</span>
  </button></li>`;
