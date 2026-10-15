import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apis } from '../../shared/api';
import type {
  ActivityQuery,
  CancellationQuery,
  RangeKey,
} from '../../shared/types';

/** Single dashboard API instance. Swap implementations in shared/api (demo or live). */
export const dashboardApi = apis.dashboard;

/** Query key factory. All dashboard keys start with "dashboard" so mutations can invalidate everything at once. */
export const keys = {
  all: ['dashboard'] as const,
  session: () => [...keys.all, 'session'] as const,
  overview: (range: RangeKey) => [...keys.all, 'overview', range] as const,
  cancellations: (q: CancellationQuery) => [...keys.all, 'cancellations', q] as const,
  cancellation: (id: string) => [...keys.all, 'cancellation', id] as const,
  alerts: (status: 'open' | 'resolved' | 'all') => [...keys.all, 'alerts', status] as const,
  activity: (q: ActivityQuery) => [...keys.all, 'activity', q] as const,
  settings: () => [...keys.all, 'settings'] as const,
  demo: () => [...keys.all, 'demo'] as const,
};

export function useSession() {
  return useQuery({ queryKey: keys.session(), queryFn: () => dashboardApi.getSession(), staleTime: 60_000 });
}

export function useOverview(range: RangeKey) {
  return useQuery({
    queryKey: keys.overview(range),
    queryFn: () => dashboardApi.getOverview(range),
    placeholderData: keepPreviousData,
  });
}

export function useCancellations(query: CancellationQuery) {
  return useQuery({
    queryKey: keys.cancellations(query),
    queryFn: () => dashboardApi.listCancellations(query),
    placeholderData: keepPreviousData,
  });
}

export function useCancellation(id: string) {
  return useQuery({ queryKey: keys.cancellation(id), queryFn: () => dashboardApi.getCancellation(id) });
}

export function useAlerts(status: 'open' | 'resolved' | 'all') {
  return useQuery({ queryKey: keys.alerts(status), queryFn: () => dashboardApi.listAlerts(status) });
}

export function useActivity(query: ActivityQuery) {
  return useQuery({
    queryKey: keys.activity(query),
    queryFn: () => dashboardApi.listActivity(query),
    placeholderData: keepPreviousData,
  });
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings(), queryFn: () => dashboardApi.getSettings() });
}

export function useDemoControls() {
  return useQuery({ queryKey: keys.demo(), queryFn: () => dashboardApi.getDemoControls() });
}
