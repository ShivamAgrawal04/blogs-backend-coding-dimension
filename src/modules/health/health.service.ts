import { Inject, Injectable } from '@nestjs/common';
import { HEALTH_REPOSITORY } from '@/database/database.tokens';
import type { HealthRepository } from '@/database/repositories/interfaces/health.repository';
import { SettingsService } from '@/database/settings.service';

@Injectable()
export class HealthService {
  constructor(
    @Inject(HEALTH_REPOSITORY)
    private readonly healthRepository: HealthRepository,
    private readonly settingsService: SettingsService,
  ) {}

  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      dbProvider: this.settingsService.getProvider(),
      availableDbProviders: this.settingsService.getAvailableProviders(),
    };
  }

  async live() {
    return { status: 'alive' };
  }

  async ready() {
    const ready = await this.healthRepository.isReady();
    if (!ready) {
      return {
        status: 'unhealthy',
        database: 'disconnected',
        dbProvider: this.settingsService.getProvider(),
      };
    }
    return {
      status: 'ready',
      database: 'connected',
      dbProvider: this.settingsService.getProvider(),
    };
  }
}
