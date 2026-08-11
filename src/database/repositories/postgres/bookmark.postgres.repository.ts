import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import {
  blogs,
  bookmarks,
  comments,
  likes,
  notes,
  subjects,
  users,
} from '@/db/schema';
import type { BookmarkRepository } from '@/database/repositories/interfaces/bookmark.repository';

@Injectable()
export class PostgresBookmarkRepository implements BookmarkRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async toggle(userId: string, input: { blogId?: string; noteId?: string }) {
    const target = this.targetCondition(input.blogId, input.noteId);
    const [existing] = await this.db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), target))
      .limit(1);

    if (existing) {
      await this.db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
      return { bookmarked: false };
    }

    await this.db.insert(bookmarks).values({
      id: createId(),
      userId,
      blogId: input.blogId ?? null,
      noteId: input.noteId ?? null,
    });

    return { bookmarked: true };
  }

  async getUserBookmarks(userId: string) {
    const items = await this.db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));

    return Promise.all(
      items.map(async (item) => {
        let blog = null;
        let note = null;

        if (item.blogId) {
          const [row] = await this.db
            .select({
              id: blogs.id,
              title: blogs.title,
              slug: blogs.slug,
              description: blogs.description,
              category: blogs.category,
              readTime: blogs.readTime,
              imageGradient: blogs.imageGradient,
              authorId: users.id,
              authorName: users.name,
              authorImage: users.image,
            })
            .from(blogs)
            .innerJoin(users, eq(blogs.authorId, users.id))
            .where(eq(blogs.id, item.blogId))
            .limit(1);

          if (row) {
            const [[likeCount], [commentCount]] = await Promise.all([
              this.db
                .select({ value: count() })
                .from(likes)
                .where(eq(likes.blogId, item.blogId)),
              this.db
                .select({ value: count() })
                .from(comments)
                .where(eq(comments.blogId, item.blogId)),
            ]);
            blog = {
              id: row.id,
              title: row.title,
              slug: row.slug,
              description: row.description,
              category: row.category,
              readTime: row.readTime,
              imageGradient: row.imageGradient,
              author: {
                id: row.authorId,
                name: row.authorName,
                image: row.authorImage,
              },
              _count: {
                likes: likeCount?.value ?? 0,
                comments: commentCount?.value ?? 0,
              },
            };
          }
        } else if (item.noteId) {
          const [row] = await this.db
            .select({
              id: notes.id,
              title: notes.title,
              slug: notes.slug,
              description: notes.description,
              readTime: notes.readTime,
              subjectId: subjects.id,
              subjectName: subjects.name,
              subjectSlug: subjects.slug,
              subjectIcon: subjects.icon,
            })
            .from(notes)
            .innerJoin(subjects, eq(notes.subjectId, subjects.id))
            .where(eq(notes.id, item.noteId))
            .limit(1);

          if (row) {
            const [[likeCount], [commentCount]] = await Promise.all([
              this.db
                .select({ value: count() })
                .from(likes)
                .where(eq(likes.noteId, item.noteId)),
              this.db
                .select({ value: count() })
                .from(comments)
                .where(eq(comments.noteId, item.noteId)),
            ]);
            note = {
              id: row.id,
              title: row.title,
              slug: row.slug,
              description: row.description,
              readTime: row.readTime,
              subject: {
                id: row.subjectId,
                name: row.subjectName,
                slug: row.subjectSlug,
                icon: row.subjectIcon,
              },
              _count: {
                likes: likeCount?.value ?? 0,
                comments: commentCount?.value ?? 0,
              },
            };
          }
        }

        return { ...item, blog, note };
      }),
    );
  }

  async isBookmarked(
    userId: string,
    blogId?: string,
    noteId?: string,
  ): Promise<boolean> {
    const [bookmark] = await this.db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), this.targetCondition(blogId, noteId)))
      .limit(1);
    return !!bookmark;
  }

  private targetCondition(blogId?: string, noteId?: string): SQL {
    if (blogId) return eq(bookmarks.blogId, blogId);
    if (noteId) return eq(bookmarks.noteId, noteId);
    throw new BadRequestException('blogId or noteId is required');
  }
}
