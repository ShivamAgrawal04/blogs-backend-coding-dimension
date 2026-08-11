import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { TrackPageViewDto } from '@/modules/analytics/dto/track-page-view.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post()
  @ApiOperation({ summary: 'Track a page view' })
  @HttpCode(HttpStatus.CREATED)
  trackPageView(@Body() dto: TrackPageViewDto, @Req() request: Request) {
    return this.analyticsService.trackPageView(dto, request);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics overview (admin only)' })
  @ApiQuery({ name: 'days', required: false, description: 'Date range in days' })
  getAnalytics(@Query('days') days?: number) {
    return this.analyticsService.getAnalytics(days);
  }
}
