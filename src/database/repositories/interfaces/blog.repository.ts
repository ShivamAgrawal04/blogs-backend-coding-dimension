import type { BlogEntity, BlogStatus } from '@/database/types';

export interface BlogListQuery {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
}

export interface CreateBlogInput {
  title: string;
  slug?: string;
  description: string;
  content: string;
  category: string;
  readTime?: string;
  status?: BlogStatus;
  featured?: boolean;
  imageGradient?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  tags?: string[];
}

export interface UpdateBlogInput extends Partial<CreateBlogInput> {}

export type BlogSlugRecord = Pick<
  BlogEntity,
  'slug' | 'updatedAt' | 'publishedAt'
>;

export interface BlogRepository {
  listPublished(query: BlogListQuery): Promise<any>;
  findPublishedByIdOrSlug(idOrSlug: string): Promise<any | null>;
  listPublishedSlugs(): Promise<BlogSlugRecord[]>;
  create(authorId: string, input: CreateBlogInput): Promise<any>;
  update(id: string, input: UpdateBlogInput): Promise<any | null>;
  delete(id: string): Promise<boolean>;
  listAdmin(): Promise<any[]>;
  findAdminById(id: string): Promise<any | null>;
}
