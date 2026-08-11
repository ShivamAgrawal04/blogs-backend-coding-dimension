import { Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ANALYTICS_REPOSITORY } from '@/database/database.tokens';
import type { AnalyticsRepository } from '@/database/repositories/interfaces/analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analyticsRepository: AnalyticsRepository,
  ) {}

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

    return this.analyticsRepository.trackPageView({
      path: dto.path,
      referer: dto.referer,
      userId: dto.userId,
      ip,
      userAgent,
    });
  }

  async getStats() {
    return this.analyticsRepository.getStats();
  }

  async getAnalytics(days?: number) {
    return this.analyticsRepository.getAnalytics(days);
  }
}
