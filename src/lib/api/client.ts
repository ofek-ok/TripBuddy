const TOKEN_KEY = 'tb_auth_token';

export function getAuthToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) errMsg = errBody.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return (await res.json()) as T;
}
