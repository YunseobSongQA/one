import { FREQS, SLOTS, habitProgress } from '../core/logic.js';
import { esc, toggle } from '../core/view.js';
import { ARROW_PATHS, cellAt, childLinks, displayText, setCell, toIndex, toPos, wrapLines } from './logic.js';

const KINDS = { value: '값', habit: '습관', task: '할 일' };
const NINE = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const sheet = document.querySelector('#sheet');

// 화면 상태 (저장하지 않음)
let chartId = 'life';
let block = null; // null이면 9×9, 0~8이면 그 블록 확대
let editMode = false;
let showProgress = false;

export function render({ header, main }, ctx) {
  const { charts, logs } = ctx.state;
  const chart = charts.find((c) => c.id === chartId);
  const links = childLinks(charts);
  const now = new Date();
  // 하위 차트면 상위 경로(예: 가치관 › 생산활동)
  const parent = chart.parent && charts.find((c) => c.id === chart.parent.chart);
  const parentTheme = parent && parent.themes.findIndex((t) => t.id === chart.parent.theme);
  const go = (id, b = null) => {
    chartId = id;
    block = b;
    ctx.render();
  };

  // 칸 하나. 슬래시 뒤에는 <wbr>을 넣어 그 자리에서 줄이 바뀔 수 있게 한다.
  const cellHTML = (b, c) => {
    const cell = cellAt(chart, b, c);
    const classes = ['cell', cell.kind, cell.arrow && `arrow ${cell.arrow[0]}`, links[cell.item?.id] && 'link'];
    const style = cell.arrow ? ` style="--rotate:${cell.arrow[1]}deg"` : '';
    const text = cell.text ? `<span>${esc(displayText(cell)).replaceAll('/', '/<wbr>')}</span>` : '<span class="plus">+</span>';
    const bar = showProgress && cell.item?.kind === 'habit'
      ? `<i class="bar" style="--rate:${habitProgress(cell.item.freq, cell.item.habitKey, logs, now).rate}"></i>`
      : '';
    return `<div class="${classes.filter(Boolean).join(' ')}" data-cell="${c}"${style}>${text}${bar}</div>`;
  };
  const blockHTML = (b) => `<div class="block" data-block="${b}">${NINE.map((c) => cellHTML(b, c)).join('')}</div>`;

  header.innerHTML = `
    <div class="row">
      <div class="seg">${charts.map((c) => `<button data-chart="${c.id}" aria-pressed="${c.id === chartId}">${esc(c.title)}</button>`).join('')}</div>
      <span class="spacer"></span>
      <button class="text-button" id="save-image">이미지 저장</button>
    </div>
    <div class="row">
      ${parent ? `<button class="crumb" id="crumb">${esc(parent.title)} › ${esc(parent.themes[parentTheme].title || '빈 테마')}</button>` : ''}
      <span class="spacer"></span>
      ${toggle('edit-mode', '편집 모드', editMode)}
      ${toggle('show-progress', '진행률', showProgress)}
    </div>`;

  main.className = 'fill';
  if (block === null) {
    main.innerHTML = `<div class="stage"><div class="chart">${NINE.map(blockHTML).join('')}</div></div>`;
  } else {
    const theme = block === 4 ? null : chart.themes[toIndex(block)];
    const child = theme && charts.find((c) => c.parent?.theme === theme.id);
    main.innerHTML = `
      <div class="row zoom-bar">
        <button class="text-button" id="back">‹ 전체</button>
        <strong>${theme ? esc(theme.title || '빈 테마') : '중심'}</strong>
        <span class="spacer"></span>
        ${child ? `<button class="text-button" id="child">${esc(child.title)} 만다라트 ›</button>` : ''}
      </div>
      <div class="stage"><div class="chart zoom">${blockHTML(block)}</div></div>`;
    main.querySelector('#back').onclick = () => go(chartId);
    if (child) main.querySelector('#child').onclick = () => go(child.id);
  }

  for (const button of header.querySelectorAll('[data-chart]')) button.onclick = () => go(button.dataset.chart);
  header.querySelector('#save-image').onclick = () => saveImage(chart, (item) => habitProgress(item.freq, item.habitKey, logs, now).rate);
  header.querySelector('#edit-mode').onchange = (e) => {
    editMode = e.target.checked;
  };
  header.querySelector('#show-progress').onchange = (e) => {
    showProgress = e.target.checked;
    ctx.render();
  };
  if (parent) header.querySelector('#crumb').onclick = () => go(parent.id, toPos(parentTheme));

  main.querySelector('.chart').onclick = (e) => {
    const el = e.target.closest('[data-cell]');
    if (!el) return;
    const b = Number(el.parentElement.dataset.block);
    const c = Number(el.dataset.cell);
    const cell = cellAt(chart, b, c);
    const link = links[cell.item?.id];
    if (!cell.text || editMode) openSheet(ctx, chart, b, c);
    else if (block === null) go(chartId, b);
    else if (link) go(link);
    else openSheet(ctx, chart, b, c);
  };
}

// ── 칸 편집 시트 ──

const options = (labels, selected) =>
  Object.entries(labels).map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');

function openSheet(ctx, chart, b, c) {
  const cell = cellAt(chart, b, c);
  const { item } = cell;
  const title = cell.kind === 'goal' ? '최종 목표' : cell.kind === 'theme' ? '테마' : chart.themes[cell.theme].title || '칸';
  // showModal은 첫 입력란에 포커스를 줘서 키보드가 뜬다. 제목에 autofocus를 둬 막고, 빈 칸일 때만 입력란에 포커스한다.
  sheet.innerHTML = `
    <form>
      <h2 tabindex="-1" autofocus>${esc(chart.title)} · ${esc(title)}</h2>
      <input name="text" value="${esc(cell.text)}" placeholder="내용을 입력하세요" autocomplete="off" enterkeyhint="done">
      ${item ? `
        <div class="seg">${Object.entries(KINDS).map(([value, label]) => `<label><input type="radio" name="kind" value="${value}"${item.kind === value ? ' checked' : ''}><span>${label}</span></label>`).join('')}</div>
        <div class="fields" data-kind="habit">
          <label>빈도 <span><select name="freq">${options(FREQS, item.freq.type)}</select>
            <span data-count><input name="count" type="number" inputmode="numeric" min="1" max="31" value="${item.freq.count}"> 회</span></span></label>
          <label>시간대 <select name="slot">${options(SLOTS, item.slot)}</select></label>
        </div>
        <label class="fields check" data-kind="task"><input type="checkbox" name="done"${item.done ? ' checked' : ''}> 완료</label>` : ''}
      <div class="actions">
        <button type="button" class="button" value="cancel">취소</button>
        <button class="button primary">저장</button>
      </div>
    </form>`;

  const form = sheet.querySelector('form');
  const fields = form.elements;
  const showFields = () => {
    for (const el of form.querySelectorAll('[data-kind]')) el.hidden = el.dataset.kind !== fields.kind.value;
    form.querySelector('[data-count]').hidden = !['weekly', 'monthly'].includes(fields.freq.value);
  };
  if (item) {
    form.onchange = showFields;
    showFields();
  }
  form.onsubmit = (e) => {
    e.preventDefault();
    const edit = item
      ? { text: fields.text.value, kind: fields.kind.value, freq: { type: fields.freq.value, count: Number(fields.count.value) }, slot: fields.slot.value, done: fields.done.checked }
      : { text: fields.text.value };
    ctx.update((s) => setCell(s, chart.id, b, c, edit));
    sheet.close();
  };
  form.querySelector('[value=cancel]').onclick = () => sheet.close();
  sheet.showModal();
  if (!cell.text) fields.text.focus();
}

// ── 이미지 저장 ──

// 화면과 같은 차트를 canvas에 그린다. 960px 차트를 2배로 그려 1920px PNG가 된다. 색은 style.css의 차트 색과 같다.
const COLORS = { goal: '#3e9142', theme: '#c4d82e', item: '#ffffff' };

function saveImage(chart, rateOf) {
  const canvas = drawChart(chart, rateOf);
  // share는 탭 직후에만 허용되므로 toBlob(비동기) 대신 toDataURL로 바로 만든다.
  const bytes = Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]), (ch) => ch.charCodeAt(0));
  const file = new File([bytes], `만다라트-${chart.title}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {}); // 공유 시트를 닫아도 조용히 끝낸다
    return;
  }
  const page = `<meta name="viewport" content="width=device-width"><title>${esc(file.name)}</title>
    <p style="font:16px system-ui;text-align:center">이미지를 길게 눌러 저장하세요.</p>
    <img src="${URL.createObjectURL(file)}" style="width:100%">`;
  window.open(URL.createObjectURL(new Blob([page], { type: 'text/html;charset=utf-8' })), '_blank');
}

function drawChart(chart, rateOf) {
  const SIZE = 960;
  const SCALE = 2;
  const size = (SIZE - 18) / 9; // 칸 크기: 굵은 선 3px × 4, 가는 선 1px × 6을 뺀 나머지
  const family = getComputedStyle(document.body).fontFamily;
  const canvas = Object.assign(document.createElement('canvas'), { width: SIZE * SCALE, height: SIZE * SCALE });
  const g = canvas.getContext('2d');

  // 칸 하나: 배경 → 화살표 → 글자 → 진행률 막대. 칸 밖으로 나간 부분은 자른다(CSS의 overflow: hidden).
  const drawCell = (cell, x, y) => {
    g.save();
    g.beginPath();
    g.rect(x, y, size, size);
    g.clip();
    g.fillStyle = COLORS[cell.kind];
    g.fillRect(x, y, size, size);
    if (cell.arrow) {
      const [shape, rotate] = cell.arrow;
      g.save();
      g.translate(x + size / 2, y + size / 2);
      g.rotate((rotate * Math.PI) / 180);
      g.scale(size / 100, size / 100);
      g.translate(-50, -50);
      g.fillStyle = COLORS.theme;
      g.fill(new Path2D(ARROW_PATHS[shape]));
      g.restore();
    }
    const fontSize = size * (cell.kind === 'goal' ? 0.155 : 0.17);
    g.font = `700 ${fontSize}px ${family}`;
    g.letterSpacing = `${-0.03 * fontSize}px`;
    g.fillStyle = cell.kind === 'goal' ? '#ffffff' : '#2a2a2a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const lines = wrapLines(displayText(cell), size * 0.9, (text) => g.measureText(text).width);
    lines.forEach((line, i) => g.fillText(line, x + size / 2, y + size / 2 + (i - (lines.length - 1) / 2) * fontSize * 1.18));
    if (showProgress && cell.item?.kind === 'habit') {
      const [barX, barY, barW, barH] = [x + size * 0.12, y + size * 0.88, size * 0.76, size * 0.06];
      for (const [color, width] of [['#e2e2e2', barW], [COLORS.goal, barW * rateOf(cell.item)]]) {
        g.fillStyle = color;
        g.beginPath();
        g.roundRect(barX, barY, width, barH, barH / 2);
        g.fill();
      }
    }
    g.restore();
  };

  g.scale(SCALE, SCALE);
  g.fillStyle = '#9b9b9b';
  g.fillRect(0, 0, SIZE, SIZE);
  for (const b of NINE) {
    const x = 3 + (b % 3) * (size * 3 + 5);
    const y = 3 + Math.floor(b / 3) * (size * 3 + 5);
    g.fillStyle = '#d0d0d0';
    g.fillRect(x, y, size * 3 + 2, size * 3 + 2);
    for (const c of NINE) drawCell(cellAt(chart, b, c), x + (c % 3) * (size + 1), y + Math.floor(c / 3) * (size + 1));
  }
  return canvas;
}
