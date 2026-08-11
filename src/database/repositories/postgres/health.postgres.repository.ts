import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import type { HealthRepository } from '@/database/repositories/interfaces/health.repository';

@Injectable()
export class PostgresHealthRepository implements HealthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async isReady(): Promise<boolean> {
    try {
      await this.db.execute(sql`select 1`);
      return true;
    } catch {
      return false;
    }
  }
}
