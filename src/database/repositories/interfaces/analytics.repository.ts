import type { PageViewEntity } from '@/database/types';

export interface TrackPageViewInput {
  path: string;
  referer?: string;
  userId?: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AnalyticsRepository {
  trackPageView(input: TrackPageViewInput): Promise<PageViewEntity>;
  getStats(): Promise<any>;
  getAnalytics(days?: number): Promise<any>;
}
