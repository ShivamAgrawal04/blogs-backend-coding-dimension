import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, or, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { blogs, blogTags, comments, likes, tags } from '@/db/schema';
import {
  BlogRepository,
  CreateBlogInput,
  UpdateBlogInput,
} from '@/database/repositories/interfaces/blog.repository';
import {
  buildPaginationMeta,
  slugify,
} from '@/database/repositories/repository.helpers';
import type { BlogStatus } from '@/database/types';

@Injectable()
export class PostgresBlogRepository implements BlogRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listPublished(query: { page?: number; limit?: number; category?: string; tag?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const conditions: SQL[] = [eq(blogs.status, 'PUBLISHED')];

    if (query.category) {
      conditions.push(eq(blogs.category, query.category));
    }

    if (query.tag) {
      const tagged = await this.db
        .select({ blogId: blogTags.blogId })
        .from(blogTags)
        .innerJoin(tags, eq(blogTags.tagId, tags.id))
        .where(eq(tags.slug, query.tag));
      if (!tagged.length) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      conditions.push(inArray(blogs.id, tagged.map((row) => row.blogId)));
    }

    const where = and(...conditions);
    const [rows, total] = await Promise.all([
      this.db.query.blogs.findMany({
        where,
        with: {
          author: { columns: { id: true, name: true, image: true } },
          tags: { with: { tag: true } },
        },
        orderBy: desc(blogs.publishedAt),
        limit,
        offset: (page - 1) * limit,
      }),
      this.db.select({ value: count() }).from(blogs).where(where),
    ]);

    return {
      data: await Promise.all(rows.map((row) => this.format(row))),
      meta: buildPaginationMeta(total[0]?.value ?? 0, page, limit),
    };
  }

  async findPublishedByIdOrSlug(idOrSlug: string) {
    const row = await this.db.query.blogs.findFirst({
      where: and(
        or(eq(blogs.id, idOrSlug), eq(blogs.slug, idOrSlug)),
        eq(blogs.status, 'PUBLISHED'),
      ),
      with: {
        author: { columns: { id: true, name: true, image: true, bio: true } },
        tags: { with: { tag: true } },
      },
    });
    return row ? this.format(row) : null;
  }

  listPublishedSlugs() {
    return this.db
      .select({
        slug: blogs.slug,
        updatedAt: blogs.updatedAt,
        publishedAt: blogs.publishedAt,
      })
      .from(blogs)
      .where(eq(blogs.status, 'PUBLISHED'))
      .orderBy(desc(blogs.publishedAt));
  }

  async create(authorId: string, input: CreateBlogInput) {
    let slug = slugify(input.slug?.trim() || input.title);
    if (await this.slugExists(slug)) {
      slug = `${slug}-${Date.now()}`;
    }

    const id = createId();
    await this.db.transaction(async (tx) => {
      await tx.insert(blogs).values({
        id,
        title: input.title,
        slug,
        description: input.description,
        content: input.content,
        category: input.category,
        readTime: input.readTime || '',
        status: (input.status as BlogStatus) || 'DRAFT',
        featured: input.featured || false,
        imageGradient: input.imageGradient || 'from-[#033b2a] to-[#1e4d3a]',
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
        authorId,
      });
      await this.setTags(tx, id, input.tags);
    });

    return this.findAdminById(id);
  }

  async update(id: string, input: UpdateBlogInput) {
    const [existing] = await this.db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
    if (!existing) {
      return null;
    }

    const { tags: tagNames, slug: requestedSlug, ...values } = input;
    let slug = existing.slug;
    if (requestedSlug || (input.title && input.title !== existing.title)) {
      slug = slugify(requestedSlug?.trim() || input.title || existing.title);
      const duplicate = await this.db
        .select({ id: blogs.id })
        .from(blogs)
        .where(eq(blogs.slug, slug))
        .limit(1);
      if (duplicate[0] && duplicate[0].id !== id) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(blogs)
        .set({
          ...values,
          ...(requestedSlug !== undefined || input.title ? { slug } : {}),
          ...(input.status === 'PUBLISHED' && !existing.publishedAt
            ? { publishedAt: new Date() }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(blogs.id, id));

      if (tagNames) {
        await tx.delete(blogTags).where(eq(blogTags.blogId, id));
        await this.setTags(tx, id, tagNames);
      }
    });

    return this.findAdminById(id);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(blogs)
      .where(eq(blogs.id, id))
      .returning({ id: blogs.id });
    return deleted.length > 0;
  }

  async listAdmin() {
    const rows = await this.db.query.blogs.findMany({
      with: {
        author: { columns: { id: true, name: true, image: true } },
        tags: { with: { tag: true } },
      },
      orderBy: desc(blogs.createdAt),
    });
    return Promise.all(rows.map((row) => this.format(row)));
  }

  async findAdminById(id: string) {
    const row = await this.db.query.blogs.findFirst({
      where: eq(blogs.id, id),
      with: {
        author: { columns: { id: true, name: true, image: true } },
        tags: { with: { tag: true } },
      },
    });
    return row ? this.format(row) : null;
  }

  private async format(row: any) {
    const [[likeCount], [commentCount]] = await Promise.all([
      this.db.select({ value: count() }).from(likes).where(eq(likes.blogId, row.id)),
      this.db
        .select({ value: count() })
        .from(comments)
        .where(eq(comments.blogId, row.id)),
    ]);

    return {
      ...row,
      tags: (row.tags || []).map((item: { tag: unknown }) => item.tag),
      likeCount: likeCount?.value ?? 0,
      commentCount: commentCount?.value ?? 0,
    };
  }

  private async slugExists(slug: string) {
    const [existing] = await this.db
      .select({ id: blogs.id })
      .from(blogs)
      .where(eq(blogs.slug, slug))
      .limit(1);
    return !!existing;
  }

  private async setTags(tx: any, blogId: string, names?: string[]) {
    for (const name of names || []) {
      const slug = slugify(name);
      await tx
        .insert(tags)
        .values({ id: createId(), name, slug })
        .onConflictDoNothing({ target: tags.slug });
      const [tag] = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.slug, slug))
        .limit(1);
      await tx
        .insert(blogTags)
        .values({ blogId, tagId: tag.id })
        .onConflictDoNothing();
    }
  }
}
