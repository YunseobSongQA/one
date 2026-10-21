// 여러 화면이 함께 쓰는 DOM 조각

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

export const toggle = (id, label, on) =>
  `<label class="toggle"><input type="checkbox" id="${id}"${on ? ' checked' : ''}><i></i>${label}</label>`;
