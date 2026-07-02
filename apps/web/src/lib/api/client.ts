const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000' : '');

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly feature?: string;

  constructor(
    message: string,
    statusCode: number,
    options?: { code?: string; feature?: string },
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.code = options?.code;
    this.feature = options?.feature;
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    const message =
      (typeof body.error === 'string' ? body.error : undefined) ??
      (typeof body.message === 'string' ? body.message : undefined) ??
      `HTTP ${res.status}`;
    const code = typeof body.code === 'string' ? body.code : undefined;
    const feature = typeof body.feature === 'string' ? body.feature : undefined;

    if (res.status === 402 && code === 'upgrade_required') {
      const { showUpgradeToast } = await import('../upgrade-toast');
      showUpgradeToast(message);
    }

    throw new ApiRequestError(message, res.status, { code, feature });
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
