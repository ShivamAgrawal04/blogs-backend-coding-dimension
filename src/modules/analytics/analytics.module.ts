import { Module } from '@nestjs/common';
import { AnalyticsController } from '@/modules/analytics/analytics.controller';
import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
