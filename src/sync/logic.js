// 동기화: updatedAt이 더 최신인 쪽을 따른다.

// 'push' 이 기기 → 서버, 'pull' 서버 → 이 기기(확인 후), 'none' 같음
export function syncDirection(local, remote) {
  if (!remote || remote.updatedAt < local.updatedAt) return 'push';
  if (remote.updatedAt > local.updatedAt) return 'pull';
  return 'none';
}
