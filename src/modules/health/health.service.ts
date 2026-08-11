import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';

@Injectable()
export class HealthService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  async live() {
    return { status: 'alive' };
  }

  async ready() {
    try {
      await this.db.execute(sql`select 1`);
      return {
        status: 'ready',
        database: 'connected',
      };
    } catch {
      return {
        status: 'unhealthy',
        database: 'disconnected',
      };
    }
  }
}
