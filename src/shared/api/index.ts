import type { DashboardApi, WidgetApi } from '../types';
import { createMockDashboardApi, createMockWidgetApi, type MockOptions } from '../mock/api';
import { createHttpDashboardApi, createHttpWidgetApi } from '../http/client';

/**
 * Chooses the implementation at build time.
 *  - VITE_API_MODE=demo (default): in-browser mock backed by localStorage.
 *  - VITE_API_MODE=live: HTTP client against VITE_API_BASE_URL (empty = same origin).
 */
export type ApiMode = 'demo' | 'live';

export function resolveApiMode(raw: string | undefined): ApiMode {
  return raw === 'live' ? 'live' : 'demo';
}

export interface ApiBundle {
  dashboard: DashboardApi;
  widget: WidgetApi;
}

export function createApis(mode: ApiMode, baseUrl: string, mockOpts?: MockOptions): ApiBundle {
  if (mode === 'live') {
    const http = { baseUrl };
    return { dashboard: createHttpDashboardApi(http), widget: createHttpWidgetApi(http) };
  }
  return { dashboard: createMockDashboardApi(mockOpts), widget: createMockWidgetApi(mockOpts) };
}

export const apis: ApiBundle = createApis(
  resolveApiMode(import.meta.env.VITE_API_MODE),
  import.meta.env.VITE_API_BASE_URL ?? '',
);
