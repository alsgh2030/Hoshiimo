let accessToken = null;
let pendingRefresh = null;
let onSession = () => {};

export function watchSession(callback) { onSession = callback; }
export function acceptSession(session) {
  accessToken = session?.access_token ?? null;
  onSession(session?.user ?? null);
}

export async function restoreSession() {
  if (!pendingRefresh) {
    pendingRefresh = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async response => {
        if (response.status === 401) { acceptSession(null); return false; }
        if (!response.ok) throw new Error('認証サーバーに接続できません。しばらくしてから再試行してください。');
        acceptSession(await response.json());
        return true;
      }).finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
}

export async function api(path, options = {}, retry = true) {
  const headers = { ...options.headers };
  const multipart = options.body instanceof FormData;
  if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`/api${path}`, {
    ...options, headers, credentials: 'include',
    body: options.body === undefined ? undefined : multipart ? options.body : JSON.stringify(options.body),
  });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await restoreSession()) return api(path, options, false);
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    const message = typeof detail === 'string' ? detail : Array.isArray(detail)
      ? detail.map(e => `${e.loc.at(-1)}: ${e.msg}`).join(' / ') : '通信に失敗しました。もう一度お試しください。';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}
