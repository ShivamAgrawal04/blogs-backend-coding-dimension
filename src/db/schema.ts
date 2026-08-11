import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('UserRole', ['USER', 'ADMIN']);
export const blogStatusEnum = pgEnum('BlogStatus', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const reactionTypeEnum = pgEnum('ReactionType', ['LIKE', 'DISLIKE']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  username: text('username').unique(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'),
  role: userRoleEnum('role').notNull().default('USER'),
  bio: text('bio'),
  dateOfBirth: timestamp('dateOfBirth', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
});

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    expiresAt: integer('expiresAt'),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('oauth_provider_account_idx').on(t.provider, t.providerAccountId)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('tokenHash').notNull().unique(),
    expiresAt: timestamp('expiresAt', { mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
    revokedAt: timestamp('revokedAt', { mode: 'date' }),
  },
  (t) => [index('refresh_tokens_user_idx').on(t.userId)],
);

export const blogs = pgTable(
  'blogs',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description').notNull(),
    content: text('content').notNull(),
    authorId: text('authorId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    readTime: text('readTime').notNull().default(''),
    status: blogStatusEnum('status').notNull().default('DRAFT'),
    featured: boolean('featured').notNull().default(false),
    imageGradient: text('imageGradient').notNull().default('from-[#033b2a] to-[#1e4d3a]'),
    metaTitle: text('metaTitle'),
    metaDescription: text('metaDescription'),
    views: integer('views').notNull().default(0),
    publishedAt: timestamp('publishedAt', { mode: 'date' }),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('blogs_slug_idx').on(t.slug),
    index('blogs_category_idx').on(t.category),
    index('blogs_status_idx').on(t.status),
  ],
);

export const tags = pgTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

export const blogTags = pgTable(
  'blog_tags',
  {
    blogId: text('blogId')
      .notNull()
      .references(() => blogs.id, { onDelete: 'cascade' }),
    tagId: text('tagId')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.blogId, t.tagId] })],
);

export const subjects = pgTable(
  'subjects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    icon: text('icon').notNull().default('📘'),
    sortOrder: integer('sortOrder').notNull().default(0),
  },
  (t) => [index('subjects_slug_idx').on(t.slug)],
);

export const notes = pgTable(
  'notes',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    content: text('content').notNull(),
    date: timestamp('date', { mode: 'date' }).notNull().defaultNow(),
    readTime: text('readTime').notNull(),
    views: integer('views').notNull().default(0),
    subjectId: text('subjectId')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    sortOrder: integer('sortOrder').notNull().default(0),
    metaTitle: text('metaTitle'),
    metaDescription: text('metaDescription'),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('notes_subject_slug_idx').on(t.subjectId, t.slug),
    index('notes_subject_idx').on(t.subjectId),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    text: text('text').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blogId: text('blogId').references(() => blogs.id, { onDelete: 'cascade' }),
    noteId: text('noteId').references(() => notes.id, { onDelete: 'cascade' }),
    parentId: text('parentId'),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('comments_blog_idx').on(t.blogId),
    index('comments_note_idx').on(t.noteId),
    index('comments_parent_idx').on(t.parentId),
  ],
);

export const likes = pgTable(
  'likes',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blogId: text('blogId').references(() => blogs.id, { onDelete: 'cascade' }),
    noteId: text('noteId').references(() => notes.id, { onDelete: 'cascade' }),
    commentId: text('commentId').references(() => comments.id, { onDelete: 'cascade' }),
    type: reactionTypeEnum('type').notNull().default('LIKE'),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('likes_user_blog_idx').on(t.userId, t.blogId),
    uniqueIndex('likes_user_note_idx').on(t.userId, t.noteId),
    uniqueIndex('likes_user_comment_idx').on(t.userId, t.commentId),
  ],
);

/** Wishlist items (bookmarks table) */
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blogId: text('blogId').references(() => blogs.id, { onDelete: 'cascade' }),
    noteId: text('noteId').references(() => notes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('bookmarks_user_blog_idx').on(t.userId, t.blogId),
    uniqueIndex('bookmarks_user_note_idx').on(t.userId, t.noteId),
  ],
);

export const readHistory = pgTable('read_history', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  blogId: text('blogId').references(() => blogs.id, { onDelete: 'cascade' }),
  noteId: text('noteId').references(() => notes.id, { onDelete: 'cascade' }),
  readAt: timestamp('readAt', { mode: 'date' }).notNull().defaultNow(),
  progress: integer('progress').notNull().default(0),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  active: boolean('active').notNull().default(true),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
});

export const pageViews = pgTable(
  'page_views',
  {
    id: text('id').primaryKey(),
    path: text('path').notNull(),
    ip: text('ip'),
    userAgent: text('userAgent'),
    referer: text('referer'),
    userId: text('userId'),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('page_views_path_idx').on(t.path),
    index('page_views_created_idx').on(t.createdAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  blogs: many(blogs),
  comments: many(comments),
  likes: many(likes),
  bookmarks: many(bookmarks),
  oauthAccounts: many(oauthAccounts),
  refreshTokens: many(refreshTokens),
}));

export const blogsRelations = relations(blogs, ({ one, many }) => ({
  author: one(users, { fields: [blogs.authorId], references: [users.id] }),
  tags: many(blogTags),
  comments: many(comments),
  likes: many(likes),
  bookmarks: many(bookmarks),
}));

export const blogTagsRelations = relations(blogTags, ({ one }) => ({
  blog: one(blogs, { fields: [blogTags.blogId], references: [blogs.id] }),
  tag: one(tags, { fields: [blogTags.tagId], references: [tags.id] }),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  subject: one(subjects, { fields: [notes.subjectId], references: [subjects.id] }),
  comments: many(comments),
  likes: many(likes),
  bookmarks: many(bookmarks),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
  blog: one(blogs, { fields: [bookmarks.blogId], references: [blogs.id] }),
  note: one(notes, { fields: [bookmarks.noteId], references: [notes.id] }),
}));

export const readHistoryRelations = relations(readHistory, ({ one }) => ({
  user: one(users, { fields: [readHistory.userId], references: [users.id] }),
  blog: one(blogs, { fields: [readHistory.blogId], references: [blogs.id] }),
  note: one(notes, { fields: [readHistory.noteId], references: [notes.id] }),
}));

export type User = typeof users.$inferSelect;
export type Blog = typeof blogs.$inferSelect;
export type Note = typeof notes.$inferSelect;
