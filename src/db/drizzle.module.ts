import { Global, Module } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';
import { DRIZZLE } from '@/db/drizzle.token';

export type DrizzleDB = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (): DrizzleDB => {
        const url = process.env.DATABASE_URL;
        if (!url) {
          throw new Error('DATABASE_URL is required');
        }
        const pool = new Pool({ connectionString: url });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
