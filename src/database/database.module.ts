import 'dotenv/config';
import { Global, Module, type Provider } from '@nestjs/common';
import { DrizzleModule } from '@/db/drizzle.module';
import {
  ADMIN_REPOSITORY,
  ADMIN_REPOSITORY_MONGO,
  ADMIN_REPOSITORY_PG,
  ANALYTICS_REPOSITORY,
  ANALYTICS_REPOSITORY_MONGO,
  ANALYTICS_REPOSITORY_PG,
  AUTH_TOKEN_REPOSITORY,
  AUTH_TOKEN_REPOSITORY_MONGO,
  AUTH_TOKEN_REPOSITORY_PG,
  BLOG_REPOSITORY,
  BLOG_REPOSITORY_MONGO,
  BLOG_REPOSITORY_PG,
  BOOKMARK_REPOSITORY,
  BOOKMARK_REPOSITORY_MONGO,
  BOOKMARK_REPOSITORY_PG,
  COMMENT_REPOSITORY,
  COMMENT_REPOSITORY_MONGO,
  COMMENT_REPOSITORY_PG,
  DATABASE_REPOSITORY_TOKENS,
  HEALTH_REPOSITORY,
  HEALTH_REPOSITORY_MONGO,
  HEALTH_REPOSITORY_PG,
  LIKE_REPOSITORY,
  LIKE_REPOSITORY_MONGO,
  LIKE_REPOSITORY_PG,
  NEWSLETTER_REPOSITORY,
  NEWSLETTER_REPOSITORY_MONGO,
  NEWSLETTER_REPOSITORY_PG,
  NOTE_REPOSITORY,
  NOTE_REPOSITORY_MONGO,
  NOTE_REPOSITORY_PG,
  SEARCH_REPOSITORY,
  SEARCH_REPOSITORY_MONGO,
  SEARCH_REPOSITORY_PG,
  USER_REPOSITORY,
  USER_REPOSITORY_MONGO,
  USER_REPOSITORY_PG,
} from '@/database/database.tokens';
import { MongoModule } from '@/database/mongodb/mongo.module';
import { createSwitchingRepository } from '@/database/repository-proxy';
import { SettingsService } from '@/database/settings.service';
import { MongoAdminRepository } from '@/database/repositories/mongodb/admin.mongodb.repository';
import { MongoAnalyticsRepository } from '@/database/repositories/mongodb/analytics.mongodb.repository';
import { MongoAuthTokenRepository } from '@/database/repositories/mongodb/auth-token.mongodb.repository';
import { MongoBlogRepository } from '@/database/repositories/mongodb/blog.mongodb.repository';
import { MongoBookmarkRepository } from '@/database/repositories/mongodb/bookmark.mongodb.repository';
import { MongoCommentRepository } from '@/database/repositories/mongodb/comment.mongodb.repository';
import { MongoHealthRepository } from '@/database/repositories/mongodb/health.mongodb.repository';
import { MongoLikeRepository } from '@/database/repositories/mongodb/like.mongodb.repository';
import { MongoNewsletterRepository } from '@/database/repositories/mongodb/newsletter.mongodb.repository';
import { MongoNoteRepository } from '@/database/repositories/mongodb/note.mongodb.repository';
import { MongoSearchRepository } from '@/database/repositories/mongodb/search.mongodb.repository';
import { MongoUserRepository } from '@/database/repositories/mongodb/user.mongodb.repository';
import { PostgresAdminRepository } from '@/database/repositories/postgres/admin.postgres.repository';
import { PostgresAnalyticsRepository } from '@/database/repositories/postgres/analytics.postgres.repository';
import { PostgresAuthTokenRepository } from '@/database/repositories/postgres/auth-token.postgres.repository';
import { PostgresBlogRepository } from '@/database/repositories/postgres/blog.postgres.repository';
import { PostgresBookmarkRepository } from '@/database/repositories/postgres/bookmark.postgres.repository';
import { PostgresCommentRepository } from '@/database/repositories/postgres/comment.postgres.repository';
import { PostgresHealthRepository } from '@/database/repositories/postgres/health.postgres.repository';
import { PostgresLikeRepository } from '@/database/repositories/postgres/like.postgres.repository';
import { PostgresNewsletterRepository } from '@/database/repositories/postgres/newsletter.postgres.repository';
import { PostgresNoteRepository } from '@/database/repositories/postgres/note.postgres.repository';
import { PostgresSearchRepository } from '@/database/repositories/postgres/search.postgres.repository';
import { PostgresUserRepository } from '@/database/repositories/postgres/user.postgres.repository';
import type { DbProvider } from '@/database/types';

const hasPostgres = Boolean(process.env.DATABASE_URL?.trim());
const hasMongo = Boolean(process.env.MONGODB_URI?.trim());

function switchingProvider(
  token: symbol,
  pgToken: symbol,
  mongoToken: symbol,
): Provider {
  return {
    provide: token,
    inject: [
      SettingsService,
      { token: pgToken, optional: true },
      { token: mongoToken, optional: true },
    ],
    useFactory: (
      settings: SettingsService,
      pg?: object,
      mongo?: object,
    ) => {
      const adapters: Partial<Record<DbProvider, object>> = {};
      if (pg) adapters.postgres = pg;
      if (mongo) adapters.mongodb = mongo;
      return createSwitchingRepository(settings, adapters);
    },
  };
}

const postgresAdapters: Provider[] = hasPostgres
  ? [
      { provide: USER_REPOSITORY_PG, useClass: PostgresUserRepository },
      { provide: AUTH_TOKEN_REPOSITORY_PG, useClass: PostgresAuthTokenRepository },
      { provide: BLOG_REPOSITORY_PG, useClass: PostgresBlogRepository },
      { provide: NOTE_REPOSITORY_PG, useClass: PostgresNoteRepository },
      { provide: COMMENT_REPOSITORY_PG, useClass: PostgresCommentRepository },
      { provide: LIKE_REPOSITORY_PG, useClass: PostgresLikeRepository },
      { provide: BOOKMARK_REPOSITORY_PG, useClass: PostgresBookmarkRepository },
      { provide: NEWSLETTER_REPOSITORY_PG, useClass: PostgresNewsletterRepository },
      { provide: ANALYTICS_REPOSITORY_PG, useClass: PostgresAnalyticsRepository },
      { provide: ADMIN_REPOSITORY_PG, useClass: PostgresAdminRepository },
      { provide: SEARCH_REPOSITORY_PG, useClass: PostgresSearchRepository },
      { provide: HEALTH_REPOSITORY_PG, useClass: PostgresHealthRepository },
    ]
  : [];

const mongoAdapters: Provider[] = hasMongo
  ? [
      { provide: USER_REPOSITORY_MONGO, useClass: MongoUserRepository },
      { provide: AUTH_TOKEN_REPOSITORY_MONGO, useClass: MongoAuthTokenRepository },
      { provide: BLOG_REPOSITORY_MONGO, useClass: MongoBlogRepository },
      { provide: NOTE_REPOSITORY_MONGO, useClass: MongoNoteRepository },
      { provide: COMMENT_REPOSITORY_MONGO, useClass: MongoCommentRepository },
      { provide: LIKE_REPOSITORY_MONGO, useClass: MongoLikeRepository },
      { provide: BOOKMARK_REPOSITORY_MONGO, useClass: MongoBookmarkRepository },
      { provide: NEWSLETTER_REPOSITORY_MONGO, useClass: MongoNewsletterRepository },
      { provide: ANALYTICS_REPOSITORY_MONGO, useClass: MongoAnalyticsRepository },
      { provide: ADMIN_REPOSITORY_MONGO, useClass: MongoAdminRepository },
      { provide: SEARCH_REPOSITORY_MONGO, useClass: MongoSearchRepository },
      { provide: HEALTH_REPOSITORY_MONGO, useClass: MongoHealthRepository },
    ]
  : [];

const switchingProviders: Provider[] = [
  switchingProvider(USER_REPOSITORY, USER_REPOSITORY_PG, USER_REPOSITORY_MONGO),
  switchingProvider(AUTH_TOKEN_REPOSITORY, AUTH_TOKEN_REPOSITORY_PG, AUTH_TOKEN_REPOSITORY_MONGO),
  switchingProvider(BLOG_REPOSITORY, BLOG_REPOSITORY_PG, BLOG_REPOSITORY_MONGO),
  switchingProvider(NOTE_REPOSITORY, NOTE_REPOSITORY_PG, NOTE_REPOSITORY_MONGO),
  switchingProvider(COMMENT_REPOSITORY, COMMENT_REPOSITORY_PG, COMMENT_REPOSITORY_MONGO),
  switchingProvider(LIKE_REPOSITORY, LIKE_REPOSITORY_PG, LIKE_REPOSITORY_MONGO),
  switchingProvider(BOOKMARK_REPOSITORY, BOOKMARK_REPOSITORY_PG, BOOKMARK_REPOSITORY_MONGO),
  switchingProvider(NEWSLETTER_REPOSITORY, NEWSLETTER_REPOSITORY_PG, NEWSLETTER_REPOSITORY_MONGO),
  switchingProvider(ANALYTICS_REPOSITORY, ANALYTICS_REPOSITORY_PG, ANALYTICS_REPOSITORY_MONGO),
  switchingProvider(ADMIN_REPOSITORY, ADMIN_REPOSITORY_PG, ADMIN_REPOSITORY_MONGO),
  switchingProvider(SEARCH_REPOSITORY, SEARCH_REPOSITORY_PG, SEARCH_REPOSITORY_MONGO),
  switchingProvider(HEALTH_REPOSITORY, HEALTH_REPOSITORY_PG, HEALTH_REPOSITORY_MONGO),
];

@Global()
@Module({
  imports: [
    ...(hasPostgres ? [DrizzleModule] : []),
    ...(hasMongo ? [MongoModule] : []),
  ],
  providers: [
    SettingsService,
    ...postgresAdapters,
    ...mongoAdapters,
    ...switchingProviders,
  ],
  exports: [SettingsService, ...DATABASE_REPOSITORY_TOKENS],
})
export class DatabaseModule {}
