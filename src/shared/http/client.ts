import type {
  ActivityQuery,
  Alert,
  AuditEvent,
  CancellationDetail,
  CancellationQuery,
  CancellationRecord,
  DashboardApi,
  DemoControls,
  Overview,
  Page,
  RangeKey,
  Session,
  Settings,
  WidgetApi,
  WidgetCancelInput,
  WidgetCancelResult,
  WidgetOfferInput,
  WidgetOfferResult,
  WidgetSession,
} from '../types';
import { ApiError } from '../types';

/**
 * HTTP implementation of the contracts. The production backend serves these routes under /api/v1.
 * Dashboard calls send the session cookie. Widget calls send the signed token as a bearer header.
 */

export interface HttpOptions {
  /** Origin of the API, for example https://api.stopbill.dev. Empty string means same origin. */
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

type Query = Record<string, string | number | undefined>;

function buildUrl(base: string, path: string, query?: Query): string {
  const origin = globalThis.location?.origin ?? 'http://localhost';
  const url = new URL(`${base.replace(/\/$/, '')}${path}`, origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '' && v !== 'all') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

interface RequestInit2 {
  body?: unknown;
  query?: Query;
  bearer?: string;
}

async function request<T>(opts: HttpOptions, method: string, path: string, init: RequestInit2 = {}): Promise<T> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.bearer) headers.Authorization = `Bearer ${init.bearer}`;

  const response = await fetchImpl(buildUrl(opts.baseUrl, path, init.query), {
    method,
    headers,
    credentials: 'include',
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // Non-JSON body: keep the generic message.
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function createHttpDashboardApi(opts: HttpOptions): DashboardApi {
  const call = <T>(method: string, path: string, init?: RequestInit2) => request<T>(opts, method, path, init);
  return {
    mode: 'live',
    getSession: () => call<Session | null>('GET', '/api/v1/session'),
    signIn: (email, password) => call<Session>('POST', '/api/v1/session', { body: { email, password } }),
    signOut: () => call<void>('DELETE', '/api/v1/session'),
    getOverview: (range: RangeKey) => call<Overview>('GET', '/api/v1/overview', { query: { range } }),
    listCancellations: (q: CancellationQuery) =>
      call<Page<CancellationRecord>>('GET', '/api/v1/cancellations', {
        query: { search: q.search, outcome: q.outcome, reason: q.reason, page: q.page, pageSize: q.pageSize },
      }),
    getCancellation: (id) => call<CancellationDetail>('GET', `/api/v1/cancellations/${encodeURIComponent(id)}`),
    reverifyCancellation: (id) => call<CancellationDetail>('POST', `/api/v1/cancellations/${encodeURIComponent(id)}/reverify`),
    retryCancellation: (id) => call<CancellationDetail>('POST', `/api/v1/cancellations/${encodeURIComponent(id)}/retry`),
    listAlerts: (status) => call<Alert[]>('GET', '/api/v1/alerts', { query: { status } }),
    resolveAlert: (id, note) => call<Alert>('POST', `/api/v1/alerts/${encodeURIComponent(id)}/resolve`, { body: { note } }),
    listActivity: (q: ActivityQuery) =>
      call<Page<AuditEvent>>('GET', '/api/v1/activity', { query: { type: q.type, page: q.page, pageSize: q.pageSize } }),
    getSettings: () => call<Settings>('GET', '/api/v1/settings'),
    updateSettings: (next) => call<Settings>('PUT', '/api/v1/settings', { body: next }),
    getDemoControls: () => call<DemoControls>('GET', '/api/v1/demo-controls'),
    setDemoControls: (next) => call<DemoControls>('PUT', '/api/v1/demo-controls', { body: next }),
    resetDemoData: () => call<void>('POST', '/api/v1/demo/reset'),
  };
}

export function createHttpWidgetApi(opts: HttpOptions): WidgetApi {
  return {
    getSession: (token) => request<WidgetSession>(opts, 'GET', '/api/v1/widget/session', { bearer: token }),
    acceptOffer: (token, input: WidgetOfferInput) =>
      request<WidgetOfferResult>(opts, 'POST', '/api/v1/widget/offers', { bearer: token, body: input }),
    cancel: (token, input: WidgetCancelInput) =>
      request<WidgetCancelResult>(opts, 'POST', '/api/v1/widget/cancellations', { bearer: token, body: input }),
  };
}
