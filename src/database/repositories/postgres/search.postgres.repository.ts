import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { blogs, notes } from '@/db/schema';
import type { SearchRepository } from '@/database/repositories/interfaces/search.repository';

@Injectable()
export class PostgresSearchRepository implements SearchRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async search(query: string) {
    const term = query.trim();
    if (!term) {
      return { blogs: [], notes: [], totalResults: 0 };
    }

    const pattern = `%${term}%`;
    const [blogRows, noteRows] = await Promise.all([
      this.db.query.blogs.findMany({
        where: and(
          eq(blogs.status, 'PUBLISHED'),
          or(
            ilike(blogs.title, pattern),
            ilike(blogs.description, pattern),
            ilike(blogs.content, pattern),
          ),
        ),
        limit: 20,
        orderBy: desc(blogs.createdAt),
        with: {
          author: { columns: { id: true, name: true, image: true } },
          tags: { with: { tag: true } },
        },
      }),
      this.db.query.notes.findMany({
        where: or(
          ilike(notes.title, pattern),
          ilike(notes.description, pattern),
          ilike(notes.content, pattern),
        ),
        limit: 20,
        orderBy: desc(notes.createdAt),
        with: {
          subject: { columns: { id: true, name: true, slug: true, icon: true } },
        },
      }),
    ]);

    const blogsResult = blogRows.map((blog) => ({
      ...blog,
      tags: blog.tags.map((item) => item.tag),
    }));

    return {
      blogs: blogsResult,
      notes: noteRows,
      totalResults: blogsResult.length + noteRows.length,
    };
  }
}
