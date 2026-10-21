// 설정: 설정 변경, 백업 파일 검증

export function setSettings(state, patch) {
  const next = structuredClone(state);
  Object.assign(next.settings, patch);
  return next;
}

// 가져올 백업 파일 내용을 검사해 state로 돌려준다. 형식이 맞지 않으면 Error를 던진다.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON 파일이 아니에요.');
  }
  const valid =
    data?.version === 1 &&
    Array.isArray(data.settings?.workDays) &&
    Array.isArray(data.charts) &&
    data.charts.every((c) => c.themes?.length === 8 && c.themes.every((t) => t.items?.length === 8));
  if (!valid) throw new Error('만다라트 백업 파일이 아니에요.');
  return { ...data, logs: data.logs ?? {}, reviews: data.reviews ?? {} };
}
