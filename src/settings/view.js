import { createState, dateKey } from '../core/logic.js';
import { esc } from '../core/view.js';
import { emptyChart } from '../mandalart/logic.js';
import * as seed from '../seed.js';
import { parseBackup, setSettings } from './logic.js';

const DAYS = [[1, '월'], [2, '화'], [3, '수'], [4, '목'], [5, '금'], [6, '토'], [0, '일']];
const sheet = document.querySelector('#sheet');

export function render({ header, main }, ctx) {
  const { settings, charts } = ctx.state;
  header.innerHTML = '<h1>설정</h1>';
  main.innerHTML = `
    <form class="card" id="settings">
      <h2>근무 시간</h2>
      <div class="days">${DAYS.map(([day, label]) => `
        <label><input type="checkbox" name="workDays" value="${day}"${settings.workDays.includes(day) ? ' checked' : ''}><span>${label}</span></label>`).join('')}
      </div>
      <label class="field">시작<input type="time" name="workStart" value="${settings.workStart}"></label>
      <label class="field">종료<input type="time" name="workEnd" value="${settings.workEnd}"></label>
      <label class="field">출퇴근 여유(분)<input type="number" name="commuteMinutes" inputmode="numeric" min="0" max="240" step="5" value="${settings.commuteMinutes}"></label>
      <h2>원칙 문구</h2>
      <textarea name="principle" rows="2">${esc(settings.principle)}</textarea>
    </form>
    <section class="card">
      <h2>백업</h2>
      <p class="hint">JSON 파일로 내보내고 가져옵니다. 가져오기 전에 지금 데이터를 백업 파일로 먼저 내려받아요.</p>
      <div class="buttons">
        <button class="button" id="export">내보내기</button>
        <label class="button">가져오기<input type="file" id="import" accept=".json,application/json" hidden></label>
      </div>
    </section>
    <section class="card">
      <h2>빈 차트로 시작</h2>
      <p class="hint">목표·테마·칸을 모두 비우고 처음부터 작성합니다. 실행 전에 백업 파일을 내려받아요.</p>
      <div class="buttons">${charts.map((c) => `<button class="button" data-empty="${c.id}">${esc(c.title)} 비우기</button>`).join('')}</div>
    </section>
    <section class="card">
      <h2>데이터 초기화</h2>
      <p class="hint">모든 기록과 회고를 지우고 처음 상태로 되돌립니다.</p>
      <button class="button danger" id="reset">데이터 초기화</button>
    </section>`;

  const form = main.querySelector('#settings');
  form.onsubmit = (e) => e.preventDefault();
  form.oninput = () => ctx.update((s) => setSettings(s, readSettings(form, s.settings)), { render: false });

  main.querySelector('#export').onclick = () => download(ctx.state);

  main.querySelector('#import').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 change가 일어나게
    if (!file) return;
    let data;
    try {
      data = parseBackup(await file.text());
    } catch (err) {
      alert(err.message);
      return;
    }
    confirmSheet(`'${file.name}'의 데이터로 바꿀까요? 지금 데이터는 백업 파일로 먼저 내려받아요.`, '백업 받고 가져오기', () => {
      download(ctx.state);
      ctx.update(() => data);
    });
  };

  for (const button of main.querySelectorAll('[data-empty]')) {
    const chart = charts.find((c) => c.id === button.dataset.empty);
    button.onclick = () => {
      if (!confirm(`${chart.title} 차트의 목표·테마·칸을 모두 비울까요?`)) return;
      confirmSheet(`정말 ${chart.title} 차트를 비울까요? 지금 데이터는 백업 파일로 먼저 내려받아요.`, '백업 받고 비우기', () => {
        download(ctx.state);
        ctx.update((s) => emptyChart(s, chart.id));
      });
    };
  }

  main.querySelector('#reset').onclick = () => {
    if (confirm('모든 데이터를 지우고 처음 상태로 되돌릴까요?') && confirm('되돌릴 수 없어요. 정말 초기화할까요?')) {
      ctx.update(() => createState(seed));
    }
  };
}

function readSettings(form, current) {
  const fields = form.elements;
  return {
    workDays: [...form.querySelectorAll('[name=workDays]:checked')].map((el) => Number(el.value)),
    workStart: fields.workStart.value || current.workStart, // 시간 입력을 지우면 이전 값을 유지
    workEnd: fields.workEnd.value || current.workEnd,
    commuteMinutes: Math.max(0, Number(fields.commuteMinutes.value) || 0),
    principle: fields.principle.value,
  };
}

// 백업 파일을 내려받는다. 아이폰에서는 사용자가 탭한 바로 그 핸들러 안에서 불러야 확실히 동작한다.
function download(state) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  a.download = `만다라트-백업-${dateKey(new Date())}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

// 마지막 확인은 앱 안 시트의 버튼으로 받아, 그 탭 안에서 onConfirm(백업 내려받기 + 실행)을 부른다.
function confirmSheet(message, action, onConfirm) {
  sheet.innerHTML = `
    <form>
      <p>${esc(message)}</p>
      <div class="actions">
        <button type="button" class="button" value="cancel">취소</button>
        <button class="button primary danger">${action}</button>
      </div>
    </form>`;
  const form = sheet.querySelector('form');
  form.onsubmit = (e) => {
    e.preventDefault();
    sheet.close();
    onConfirm();
  };
  form.querySelector('[value=cancel]').onclick = () => sheet.close();
  sheet.showModal();
}
