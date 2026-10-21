// 기기 간 동기화 API (Cloudflare Pages Functions): GET /api/state, PUT /api/state
// KV 바인딩 SYNC_KV의 단일 키 'state'만 get/put 한다. list()는 무료 한도를 빨리 쓰므로 쓰지 않는다.
// 인증: Authorization: Bearer <환경 변수 SYNC_TOKEN>

const NO_STORE = { 'Cache-Control': 'no-store' };

const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// 설정이 없거나 토큰이 틀리면 거절 응답, 통과하면 null
function reject(request, env) {
  if (!env.SYNC_TOKEN || !env.SYNC_KV) return new Response('동기화가 설정되지 않았습니다.', { status: 503, headers: NO_STORE });
  if (request.headers.get('Authorization') !== `Bearer ${env.SYNC_TOKEN}`) return new Response('토큰이 맞지 않습니다.', { status: 401, headers: NO_STORE });
  return null;
}

export async function onRequestGet({ request, env }) {
  const rejected = reject(request, env);
  if (rejected) return rejected;
  const state = await env.SYNC_KV.get('state');
  return new Response(state ?? 'null', { headers: { ...NO_STORE, 'Content-Type': 'application/json' } });
}

export async function onRequestPut({ request, env }) {
  const rejected = reject(request, env);
  if (rejected) return rejected;
  const body = await request.text();
  const state = parse(body);
  if (state?.version !== 1 || typeof state.updatedAt !== 'string') return new Response('만다라트 데이터가 아닙니다.', { status: 400, headers: NO_STORE });
  await env.SYNC_KV.put('state', body);
  return new Response(null, { status: 204, headers: NO_STORE });
}
