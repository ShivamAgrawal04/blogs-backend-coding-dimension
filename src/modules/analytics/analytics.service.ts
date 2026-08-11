import { Inject, Injectable } from '@nestjs/common';
import { count, desc, gte, isNotNull, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { pageViews } from '@/db/schema';
import { Request } from 'express';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async trackPageView(
    dto: { path: string; referer?: string; userId?: string },
    request?: Request,
  ) {
    const ip =
      request?.headers['x-forwarded-for']?.toString() ||
      request?.headers['x-real-ip']?.toString() ||
      request?.socket?.remoteAddress ||
      null;

    const userAgent = request?.headers['user-agent'] || null;

    const [pageView] = await this.db
      .insert(pageViews)
      .values({
        id: createId(),
        path: dto.path,
        referer: dto.referer ?? null,
        userId: dto.userId ?? null,
        ip,
        userAgent,
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
      this.db.select({ value: count() }).from(pageViews).where(gte(pageViews.createdAt, thirtyDaysAgo)),
      this.db.select({ value: count() }).from(pageViews).where(gte(pageViews.createdAt, sevenDaysAgo)),
      this.db.select({ value: count() }).from(pageViews).where(gte(pageViews.createdAt, twentyFourHoursAgo)),
      this.db.selectDistinct({ ip: pageViews.ip }).from(pageViews).where(isNotNull(pageViews.ip)),
      this.db.select({ path: pageViews.path, views: count() }).from(pageViews)
        .groupBy(pageViews.path).orderBy(desc(count())).limit(10),
    ]);

    const dailyViews = await this.dailyViews(thirtyDaysAgo);

    return {
      totalViews: totalViews[0].value,
      views30d: views30d[0].value,
      views7d: views7d[0].value,
      views24h: views24h[0].value,
      uniqueVisitors: uniqueVisitors.length,
      topPages: topPages.map((p) => ({
        path: p.path,
        views: p.views,
      })),
      dailyViews,
    };
  }

  async getAnalytics(days?: number) {
    const range = days || 30;
    const startDate = new Date(
      Date.now() - range * 24 * 60 * 60 * 1000,
    );

    const [totalViews, topPages] = await Promise.all([
      this.db.select({ value: count() }).from(pageViews).where(gte(pageViews.createdAt, startDate)),
      this.db.select({ path: pageViews.path, views: count() }).from(pageViews)
        .where(gte(pageViews.createdAt, startDate))
        .groupBy(pageViews.path).orderBy(desc(count())).limit(10),
    ]);

    const dailyViews = await this.dailyViews(startDate);

    return {
      totalViews: totalViews[0].value,
      topPages: topPages.map((p) => ({
        path: p.path,
        views: p.views,
      })),
      dailyViews,
      days: range,
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
