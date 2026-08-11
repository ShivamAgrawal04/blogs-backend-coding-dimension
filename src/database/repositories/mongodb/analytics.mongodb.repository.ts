import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createId } from '@paralleldrive/cuid2';
import { Model, PipelineStage } from 'mongoose';
import { PAGE_VIEW_MODEL } from '@/database/mongodb/schemas';
import { stripMongoMeta } from '@/database/mongodb/mongo.helpers';
import type { PageViewDocument } from '@/database/mongodb/schemas/page-views.schema';
import type {
  AnalyticsRepository,
  TrackPageViewInput,
} from '@/database/repositories/interfaces/analytics.repository';
import type { PageViewEntity } from '@/database/types';

@Injectable()
export class MongoAnalyticsRepository implements AnalyticsRepository {
  constructor(
    @InjectModel(PAGE_VIEW_MODEL)
    private readonly pageViewModel: Model<PageViewDocument>,
  ) {}

  async trackPageView(input: TrackPageViewInput): Promise<PageViewEntity> {
    const document = await this.pageViewModel.create({
      id: createId(),
      path: input.path,
      referer: input.referer ?? null,
      userId: input.userId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: new Date(),
    });
    return stripMongoMeta(document.toObject()) as PageViewEntity;
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
      dailyViews,
    ] = await Promise.all([
      this.pageViewModel.countDocuments({}).exec(),
      this.pageViewModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }).exec(),
      this.pageViewModel.countDocuments({ createdAt: { $gte: sevenDaysAgo } }).exec(),
      this.pageViewModel.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }).exec(),
      this.pageViewModel.distinct('ip', { ip: { $ne: null } }).exec(),
      this.aggregateTopPages(thirtyDaysAgo, false),
      this.aggregateDailyViews(thirtyDaysAgo),
    ]);

    return {
      totalViews,
      views30d,
      views7d,
      views24h,
      uniqueVisitors: uniqueVisitors.length,
      topPages,
      dailyViews,
    };
  }

  async getAnalytics(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [totalViews, topPages, dailyViews] = await Promise.all([
      this.pageViewModel.countDocuments({ createdAt: { $gte: startDate } }).exec(),
      this.aggregateTopPages(startDate, true),
      this.aggregateDailyViews(startDate),
    ]);

    return {
      totalViews,
      topPages,
      dailyViews,
      days,
    };
  }

  private async aggregateTopPages(startDate: Date, filterByDate: boolean) {
    const pipeline: PipelineStage[] = [];
    if (filterByDate) {
      pipeline.push({ $match: { createdAt: { $gte: startDate } } });
    }
    pipeline.push(
      { $group: { _id: '$path', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
    );

    const rows = await this.pageViewModel.aggregate(pipeline).exec();
    return rows.map((row) => ({ path: row._id as string, views: row.views as number }));
  }

  private async aggregateDailyViews(startDate: Date) {
    const rows = await this.pageViewModel
      .aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
            views: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return rows.map((row) => ({ date: row._id as string, views: row.views as number }));
  }
}
