import { Global, Module } from '@nestjs/common';
import { DrizzleModule } from '@/db/drizzle.module';
import {
  ADMIN_REPOSITORY,
  ANALYTICS_REPOSITORY,
  AUTH_TOKEN_REPOSITORY,
  BLOG_REPOSITORY,
  BOOKMARK_REPOSITORY,
  COMMENT_REPOSITORY,
  DATABASE_REPOSITORY_TOKENS,
  DB_PROVIDER_TOKEN,
  HEALTH_REPOSITORY,
  LIKE_REPOSITORY,
  NEWSLETTER_REPOSITORY,
  NOTE_REPOSITORY,
  SEARCH_REPOSITORY,
  USER_REPOSITORY,
} from '@/database/database.tokens';
import { MongoModule } from '@/database/mongodb/mongo.module';
import { resolveDbProvider } from '@/database/provider';
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
import { MongoUserRepository } from '@/database/repositories/mongodb/user.mongodb.repository';

const activeProvider = resolveDbProvider();

const postgresProviders = [
  { provide: USER_REPOSITORY, useClass: PostgresUserRepository },
  { provide: AUTH_TOKEN_REPOSITORY, useClass: PostgresAuthTokenRepository },
  { provide: BLOG_REPOSITORY, useClass: PostgresBlogRepository },
  { provide: NOTE_REPOSITORY, useClass: PostgresNoteRepository },
  { provide: COMMENT_REPOSITORY, useClass: PostgresCommentRepository },
  { provide: LIKE_REPOSITORY, useClass: PostgresLikeRepository },
  { provide: BOOKMARK_REPOSITORY, useClass: PostgresBookmarkRepository },
  { provide: NEWSLETTER_REPOSITORY, useClass: PostgresNewsletterRepository },
  { provide: ANALYTICS_REPOSITORY, useClass: PostgresAnalyticsRepository },
  { provide: ADMIN_REPOSITORY, useClass: PostgresAdminRepository },
  { provide: SEARCH_REPOSITORY, useClass: PostgresSearchRepository },
  { provide: HEALTH_REPOSITORY, useClass: PostgresHealthRepository },
];

const mongodbProviders = [
  { provide: USER_REPOSITORY, useClass: MongoUserRepository },
  { provide: AUTH_TOKEN_REPOSITORY, useClass: MongoAuthTokenRepository },
  { provide: BLOG_REPOSITORY, useClass: MongoBlogRepository },
  { provide: NOTE_REPOSITORY, useClass: MongoNoteRepository },
  { provide: COMMENT_REPOSITORY, useClass: MongoCommentRepository },
  { provide: LIKE_REPOSITORY, useClass: MongoLikeRepository },
  { provide: BOOKMARK_REPOSITORY, useClass: MongoBookmarkRepository },
  { provide: NEWSLETTER_REPOSITORY, useClass: MongoNewsletterRepository },
  { provide: ANALYTICS_REPOSITORY, useClass: MongoAnalyticsRepository },
  { provide: ADMIN_REPOSITORY, useClass: MongoAdminRepository },
  { provide: SEARCH_REPOSITORY, useClass: MongoSearchRepository },
  { provide: HEALTH_REPOSITORY, useClass: MongoHealthRepository },
];

const databaseImports = activeProvider === 'mongodb' ? [MongoModule] : [DrizzleModule];
const databaseProviders = activeProvider === 'mongodb' ? mongodbProviders : postgresProviders;

@Global()
@Module({
  imports: databaseImports,
  providers: [
    SettingsService,
    { provide: DB_PROVIDER_TOKEN, useValue: activeProvider },
    ...databaseProviders,
  ],
  exports: [
    SettingsService,
    DB_PROVIDER_TOKEN,
    ...DATABASE_REPOSITORY_TOKENS,
  ],
})
export class DatabaseModule {}
