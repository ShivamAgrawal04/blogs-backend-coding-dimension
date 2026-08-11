import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, inArray, or, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { blogs, blogTags, comments, likes, tags } from '@/db/schema';
import { CreateBlogDto } from '@/modules/blogs/dto/create-blog.dto';
import { UpdateBlogDto } from '@/modules/blogs/dto/update-blog.dto';

type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '');
}

@Injectable()
export class BlogService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findAll(query: { page?: number; limit?: number; category?: string; tag?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const conditions: SQL[] = [eq(blogs.status, 'PUBLISHED')];
    if (query.category) conditions.push(eq(blogs.category, query.category));
    if (query.tag) {
      const tagged = await this.db.select({ blogId: blogTags.blogId }).from(blogTags)
        .innerJoin(tags, eq(blogTags.tagId, tags.id)).where(eq(tags.slug, query.tag));
      if (!tagged.length) return this.paginated([], 0, page, limit);
      conditions.push(inArray(blogs.id, tagged.map((row) => row.blogId)));
    }
    const where = and(...conditions);
    const [rows, total] = await Promise.all([
      this.db.query.blogs.findMany({
        where,
        with: { author: { columns: { id: true, name: true, image: true } }, tags: { with: { tag: true } } },
        orderBy: desc(blogs.publishedAt),
        limit,
        offset: (page - 1) * limit,
      }),
      this.db.select({ value: count() }).from(blogs).where(where),
    ]);
    return this.paginated(await Promise.all(rows.map((row) => this.format(row))), total[0].value, page, limit);
  }

  async findOne(idOrSlug: string) {
    const row = await this.db.query.blogs.findFirst({
      where: and(or(eq(blogs.id, idOrSlug), eq(blogs.slug, idOrSlug)), eq(blogs.status, 'PUBLISHED')),
      with: {
        author: { columns: { id: true, name: true, image: true, bio: true } },
        tags: { with: { tag: true } },
      },
    });
    if (!row) throw new NotFoundException('Blog not found');
    return this.format(row);
  }

  listPublishedSlugs() {
    return this.db.select({ slug: blogs.slug, updatedAt: blogs.updatedAt, publishedAt: blogs.publishedAt })
      .from(blogs).where(eq(blogs.status, 'PUBLISHED')).orderBy(desc(blogs.publishedAt));
  }

  async create(authorId: string, dto: CreateBlogDto) {
    let slug = slugify(dto.slug?.trim() || dto.title);
    if (!slug) throw new BadRequestException('Invalid slug');
    if (await this.slugExists(slug)) slug = `${slug}-${Date.now()}`;
    const id = createId();
    await this.db.transaction(async (tx) => {
      await tx.insert(blogs).values({
        id,
        title: dto.title,
        slug,
        description: dto.description,
        content: dto.content,
        category: dto.category,
        readTime: dto.readTime || '',
        status: (dto.status as BlogStatus) || 'DRAFT',
        featured: dto.featured || false,
        imageGradient: dto.imageGradient || 'from-[#033b2a] to-[#1e4d3a]',
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : null,
        authorId,
      });
      await this.setTags(tx, id, dto.tags);
    });
    return this.findAdminOne(id);
  }

  async update(id: string, dto: UpdateBlogDto) {
    const [existing] = await this.db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Blog not found');
    const { tags: tagNames, slug: requestedSlug, ...values } = dto;
    let slug = existing.slug;
    if (requestedSlug || (dto.title && dto.title !== existing.title)) {
      slug = slugify(requestedSlug?.trim() || dto.title || existing.title);
      const duplicate = await this.db.select({ id: blogs.id }).from(blogs)
        .where(eq(blogs.slug, slug)).limit(1);
      if (duplicate[0] && duplicate[0].id !== id) slug = `${slug}-${Date.now()}`;
    }
    await this.db.transaction(async (tx) => {
      await tx.update(blogs).set({
        ...values,
        ...(requestedSlug !== undefined || dto.title ? { slug } : {}),
        ...(dto.status === 'PUBLISHED' && !existing.publishedAt ? { publishedAt: new Date() } : {}),
        updatedAt: new Date(),
      }).where(eq(blogs.id, id));
      if (tagNames) {
        await tx.delete(blogTags).where(eq(blogTags.blogId, id));
        await this.setTags(tx, id, tagNames);
      }
    });
    return this.findAdminOne(id);
  }

  async delete(id: string) {
    const deleted = await this.db.delete(blogs).where(eq(blogs.id, id)).returning({ id: blogs.id });
    if (!deleted.length) throw new NotFoundException('Blog not found');
    return { message: 'Blog deleted successfully' };
  }

  async findAllAdmin() {
    const rows = await this.db.query.blogs.findMany({
      with: { author: { columns: { id: true, name: true, image: true } }, tags: { with: { tag: true } } },
      orderBy: desc(blogs.createdAt),
    });
    return Promise.all(rows.map((row) => this.format(row)));
  }

  private async findAdminOne(id: string) {
    const row = await this.db.query.blogs.findFirst({
      where: eq(blogs.id, id),
      with: { author: { columns: { id: true, name: true, image: true } }, tags: { with: { tag: true } } },
    });
    if (!row) throw new NotFoundException('Blog not found');
    return this.format(row);
  }

  private async format(row: any) {
    const [[likeCount], [commentCount]] = await Promise.all([
      this.db.select({ value: count() }).from(likes).where(eq(likes.blogId, row.id)),
      this.db.select({ value: count() }).from(comments).where(eq(comments.blogId, row.id)),
    ]);
    return {
      ...row,
      tags: (row.tags || []).map((item: { tag: unknown }) => item.tag),
      likeCount: likeCount.value,
      commentCount: commentCount.value,
    };
  }

  private paginated(data: unknown[], total: number, page: number, limit: number) {
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  private async slugExists(slug: string) {
    return !!(await this.db.select({ id: blogs.id }).from(blogs).where(eq(blogs.slug, slug)).limit(1))[0];
  }

  private async setTags(tx: any, blogId: string, names?: string[]) {
    for (const name of names || []) {
      const slug = slugify(name);
      await tx.insert(tags).values({ id: createId(), name, slug }).onConflictDoNothing({ target: tags.slug });
      const [tag] = await tx.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1);
      await tx.insert(blogTags).values({ blogId, tagId: tag.id }).onConflictDoNothing();
    }
  }
}
