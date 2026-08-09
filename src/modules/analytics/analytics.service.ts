import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.pageView.create({
      data: {
        path: dto.path,
        referer: dto.referer,
        userId: dto.userId,
        ip,
        userAgent,
      },
    });
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
      this.prisma.pageView.count(),
      this.prisma.pageView.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.pageView.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.pageView.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),
      this.prisma.pageView.findMany({
        where: { ip: { not: null } },
        distinct: ['ip'],
        select: { ip: true },
      }),
      this.prisma.pageView.groupBy({
        by: ['path'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const dailyViews = await this.prisma.$queryRaw<
      Array<{ date: string; views: number }>
    >`
      SELECT DATE(created_at) as date, COUNT(*)::int as views
      FROM page_views
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return {
      totalViews,
      views30d,
      views7d,
      views24h,
      uniqueVisitors: uniqueVisitors.length,
      topPages: topPages.map((p) => ({
        path: p.path,
        views: p._count.id,
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
      this.prisma.pageView.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.pageView.groupBy({
        by: ['path'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const dailyViews = await this.prisma.$queryRaw<
      Array<{ date: string; views: number }>
    >`
      SELECT DATE(created_at) as date, COUNT(*)::int as views
      FROM page_views
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return {
      totalViews,
      topPages: topPages.map((p) => ({
        path: p.path,
        views: p._count.id,
      })),
      dailyViews,
      days: range,
    };
  }
}
