import { Inject, Injectable } from '@nestjs/common';
import {
  DB_PROVIDER_TOKEN,
  HEALTH_REPOSITORY,
} from '@/database/database.tokens';
import type { HealthRepository } from '@/database/repositories/interfaces/health.repository';
import type { DbProvider } from '@/database/types';

@Injectable()
export class HealthService {
  constructor(
    @Inject(HEALTH_REPOSITORY)
    private readonly healthRepository: HealthRepository,
    @Inject(DB_PROVIDER_TOKEN)
    private readonly dbProvider: DbProvider,
  ) {}

  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      dbProvider: this.dbProvider,
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
        dbProvider: this.dbProvider,
      };
    }
    return {
      status: 'ready',
      database: 'connected',
      dbProvider: this.dbProvider,
    };
  }
}
