// 저장소 접근은 이 파일에서만 한다.

const KEY = 'mandalart:v1';

export function load() {
  const saved = localStorage.getItem(KEY);
  return saved ? JSON.parse(saved) : null;
}

export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

// 브라우저가 저장 공간을 임의로 비우지 않도록 요청한다.
export function requestPersist() {
  navigator.storage?.persist?.();
}
