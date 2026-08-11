export type DbProvider = 'postgres' | 'mongodb';

export type UserRole = 'USER' | 'ADMIN';
export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ReactionType = 'LIKE' | 'DISLIKE';

export interface UserEntity {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  password: string | null;
  role: UserRole;
  bio: string | null;
  dateOfBirth: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthAccountEntity {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  createdAt: Date;
}

export interface RefreshTokenEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface BlogEntity {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  authorId: string;
  category: string;
  readTime: string;
  status: BlogStatus;
  featured: boolean;
  imageGradient: string;
  metaTitle: string | null;
  metaDescription: string | null;
  views: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagEntity {
  id: string;
  name: string;
  slug: string;
}

export interface BlogTagEntity {
  blogId: string;
  tagId: string;
}

export interface SubjectEntity {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
}

export interface NoteEntity {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  date: Date;
  readTime: string;
  views: number;
  subjectId: string;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentEntity {
  id: string;
  text: string;
  userId: string;
  blogId: string | null;
  noteId: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LikeEntity {
  id: string;
  userId: string;
  blogId: string | null;
  noteId: string | null;
  commentId: string | null;
  type: ReactionType;
  createdAt: Date;
}

export interface BookmarkEntity {
  id: string;
  userId: string;
  blogId: string | null;
  noteId: string | null;
  createdAt: Date;
}

export interface ReadHistoryEntity {
  id: string;
  userId: string;
  blogId: string | null;
  noteId: string | null;
  readAt: Date;
  progress: number;
}

export interface NewsletterSubscriberEntity {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageViewEntity {
  id: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  userId: string | null;
  createdAt: Date;
}
