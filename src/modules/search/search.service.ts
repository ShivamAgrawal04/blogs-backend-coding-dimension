import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { blogs, notes } from '@/db/schema';

@Injectable()
export class SearchService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async search(query: string) {
    const term = query.trim();
    if (!term) return { blogs: [], notes: [], totalResults: 0 };

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

    const formattedBlogs = blogRows.map((b) => ({
      ...b,
      tags: b.tags.map((bt) => bt.tag),
    }));

    return {
      blogs: formattedBlogs,
      notes: noteRows,
      totalResults: formattedBlogs.length + noteRows.length,
    };
  }
}
