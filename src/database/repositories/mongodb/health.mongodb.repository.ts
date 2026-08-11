import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { HealthRepository } from '@/database/repositories/interfaces/health.repository';

@Injectable()
export class MongoHealthRepository implements HealthRepository {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async isReady(): Promise<boolean> {
    try {
      if (!this.connection.db) {
        return false;
      }
      await this.connection.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}
