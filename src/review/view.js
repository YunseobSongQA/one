import { addDays, startOfWeek, weekKey } from '../core/logic.js';
import { esc } from '../core/view.js';
import { blockRates, setReview } from './logic.js';

const FIELDS = { good: '잘한 것', bad: '아쉬운 것', next: '다음 주 한 가지' };

let offset = 0; // 0이면 이번 주, -1이면 지난 주

export function render({ header, main }, ctx) {
  const now = new Date();
  const monday = addDays(startOfWeek(now), offset * 7);
  const sunday = addDays(monday, 6);
  const week = weekKey(monday);
  const review = ctx.state.reviews[week] ?? {};
  const day = (d) => `${d.getMonth() + 1}.${d.getDate()}`;
  const charts = blockRates(ctx.state.charts, ctx.state.logs, offset === 0 ? now : sunday); // 지난 주는 그 주 일요일 기준

  header.innerHTML = `
    <div class="row">
      <button class="icon-button" id="prev" aria-label="지난 주">‹</button>
      <div class="week">
        <h1>${week}</h1>
        <p class="sub">${offset === 0 ? '이번 주 · ' : ''}${day(monday)} – ${day(sunday)}</p>
      </div>
      <button class="icon-button" id="next" aria-label="다음 주"${offset === 0 ? ' disabled' : ''}>›</button>
    </div>`;

  main.innerHTML = `
    ${charts.map((chart) => `
      <section class="card">
        <h2>${esc(chart.title)} 블록별 달성률</h2>
        <ul class="rates">${chart.blocks.map((b) => `
          <li>
            <span>${esc(b.title || '빈 테마')}</span>
            ${b.rate === null ? '<small>습관 없음</small>' : `<i class="bar" style="--rate:${b.rate}"></i><b>${Math.round(b.rate * 100)}%</b>`}
          </li>`).join('')}
        </ul>
      </section>`).join('')}
    <section class="card">
      <h2>회고</h2>
      ${Object.entries(FIELDS).map(([field, label]) => `
        <label class="note">${label}<textarea data-field="${field}" rows="3">${esc(review[field] ?? '')}</textarea></label>`).join('')}
    </section>`;

  header.querySelector('#prev').onclick = () => {
    offset -= 1;
    ctx.render();
  };
  header.querySelector('#next').onclick = () => {
    offset += 1;
    ctx.render();
  };
  for (const textarea of main.querySelectorAll('[data-field]')) {
    textarea.oninput = () => ctx.update((s) => setReview(s, week, textarea.dataset.field, textarea.value), { render: false });
  }
}
