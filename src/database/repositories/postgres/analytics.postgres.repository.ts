import { Inject, Injectable } from '@nestjs/common';
import { count, desc, gte, isNotNull, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { pageViews } from '@/db/schema';
import type {
  AnalyticsRepository,
  TrackPageViewInput,
} from '@/database/repositories/interfaces/analytics.repository';
import type { PageViewEntity } from '@/database/types';

@Injectable()
export class PostgresAnalyticsRepository implements AnalyticsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async trackPageView(input: TrackPageViewInput): Promise<PageViewEntity> {
    const [pageView] = await this.db
      .insert(pageViews)
      .values({
        id: createId(),
        path: input.path,
        referer: input.referer ?? null,
        userId: input.userId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      })
      .returning();
    return pageView;
  }

  async getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalViews,
      views30d,
      views7d,
      views24h,
      uniqueVisitors,
      topPages,
    ] = await Promise.all([
      this.db.select({ value: count() }).from(pageViews),
      this.db
        .select({ value: count() })
        .from(pageViews)
        .where(gte(pageViews.createdAt, thirtyDaysAgo)),
      this.db
        .select({ value: count() })
        .from(pageViews)
        .where(gte(pageViews.createdAt, sevenDaysAgo)),
      this.db
        .select({ value: count() })
        .from(pageViews)
        .where(gte(pageViews.createdAt, twentyFourHoursAgo)),
      this.db
        .selectDistinct({ ip: pageViews.ip })
        .from(pageViews)
        .where(isNotNull(pageViews.ip)),
      this.db
        .select({ path: pageViews.path, views: count() })
        .from(pageViews)
        .groupBy(pageViews.path)
        .orderBy(desc(count()))
        .limit(10),
    ]);

    return {
      totalViews: totalViews[0]?.value ?? 0,
      views30d: views30d[0]?.value ?? 0,
      views7d: views7d[0]?.value ?? 0,
      views24h: views24h[0]?.value ?? 0,
      uniqueVisitors: uniqueVisitors.length,
      topPages: topPages.map((page) => ({ path: page.path, views: page.views })),
      dailyViews: await this.dailyViews(thirtyDaysAgo),
    };
  }

  async getAnalytics(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [totalViews, topPages] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(pageViews)
        .where(gte(pageViews.createdAt, startDate)),
      this.db
        .select({ path: pageViews.path, views: count() })
        .from(pageViews)
        .where(gte(pageViews.createdAt, startDate))
        .groupBy(pageViews.path)
        .orderBy(desc(count()))
        .limit(10),
    ]);

    return {
      totalViews: totalViews[0]?.value ?? 0,
      topPages: topPages.map((page) => ({ path: page.path, views: page.views })),
      dailyViews: await this.dailyViews(startDate),
      days,
    };
  }

  private dailyViews(startDate: Date) {
    return this.db
      .select({
        date: sql<string>`date(${pageViews.createdAt})`,
        views: sql<number>`count(*)::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate))
      .groupBy(sql`date(${pageViews.createdAt})`)
      .orderBy(sql`date(${pageViews.createdAt})`);
  }
}
