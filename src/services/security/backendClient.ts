import { SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY } from '../../config/supabase';
import { getBackendToken } from './authSession';

const FUNCTIONS = new Set([
  'ai-chat-v2', 'transcribe-audio-v2', 'verify-email-v2',
  'redeem-code-v2', 'verify-purchase-v2', 'weather-v2',
]);

export class BackendError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'BackendError';
  }
}

/** Calls only this app's authenticated functions; provider credentials stay remote. */
export async function callBackend<T>(functionName: string, payload: unknown): Promise<T> {
  if (!FUNCTIONS.has(functionName)) throw new Error('Unknown backend function.');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Backend payload must be an object.');
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getBackendToken(attempt === 1);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...payload, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        signal: controller.signal,
      });
      if (response.status === 401 && attempt === 0) continue;
      const body = await response.json();
      if (!response.ok || body?.success !== true || !Object.prototype.hasOwnProperty.call(body, 'data')) {
        throw new BackendError(
          typeof body?.error === 'string' ? body.error : 'The service is temporarily unavailable.',
          response.status,
          typeof body?.code === 'string' ? body.code : undefined,
        );
      }
      return body.data as T;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new BackendError('Please try again to reconnect securely.', 401);
}
