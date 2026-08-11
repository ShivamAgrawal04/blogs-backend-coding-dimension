import { BlogSchema } from '@/database/mongodb/schemas/blogs.schema';
import { BlogTagSchema } from '@/database/mongodb/schemas/blog-tags.schema';
import { BookmarkSchema } from '@/database/mongodb/schemas/bookmarks.schema';
import { CommentSchema } from '@/database/mongodb/schemas/comments.schema';
import { LikeSchema } from '@/database/mongodb/schemas/likes.schema';
import { NewsletterSubscriberSchema } from '@/database/mongodb/schemas/newsletter-subscribers.schema';
import { NoteSchema } from '@/database/mongodb/schemas/notes.schema';
import { OAuthAccountSchema } from '@/database/mongodb/schemas/oauth-accounts.schema';
import { PageViewSchema } from '@/database/mongodb/schemas/page-views.schema';
import { ReadHistorySchema } from '@/database/mongodb/schemas/read-history.schema';
import { RefreshTokenSchema } from '@/database/mongodb/schemas/refresh-tokens.schema';
import { SubjectSchema } from '@/database/mongodb/schemas/subjects.schema';
import { TagSchema } from '@/database/mongodb/schemas/tags.schema';
import { UserSchema } from '@/database/mongodb/schemas/users.schema';

export const USER_MODEL = 'User';
export const OAUTH_ACCOUNT_MODEL = 'OAuthAccount';
export const REFRESH_TOKEN_MODEL = 'RefreshToken';
export const BLOG_MODEL = 'Blog';
export const TAG_MODEL = 'Tag';
export const BLOG_TAG_MODEL = 'BlogTag';
export const SUBJECT_MODEL = 'Subject';
export const NOTE_MODEL = 'Note';
export const COMMENT_MODEL = 'Comment';
export const LIKE_MODEL = 'Like';
export const BOOKMARK_MODEL = 'Bookmark';
export const READ_HISTORY_MODEL = 'ReadHistory';
export const NEWSLETTER_SUBSCRIBER_MODEL = 'NewsletterSubscriber';
export const PAGE_VIEW_MODEL = 'PageView';

export const mongoModels = [
  { name: USER_MODEL, schema: UserSchema },
  { name: OAUTH_ACCOUNT_MODEL, schema: OAuthAccountSchema },
  { name: REFRESH_TOKEN_MODEL, schema: RefreshTokenSchema },
  { name: BLOG_MODEL, schema: BlogSchema },
  { name: TAG_MODEL, schema: TagSchema },
  { name: BLOG_TAG_MODEL, schema: BlogTagSchema },
  { name: SUBJECT_MODEL, schema: SubjectSchema },
  { name: NOTE_MODEL, schema: NoteSchema },
  { name: COMMENT_MODEL, schema: CommentSchema },
  { name: LIKE_MODEL, schema: LikeSchema },
  { name: BOOKMARK_MODEL, schema: BookmarkSchema },
  { name: READ_HISTORY_MODEL, schema: ReadHistorySchema },
  {
    name: NEWSLETTER_SUBSCRIBER_MODEL,
    schema: NewsletterSubscriberSchema,
  },
  { name: PAGE_VIEW_MODEL, schema: PageViewSchema },
];
