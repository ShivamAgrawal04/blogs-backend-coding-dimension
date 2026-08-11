import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { isSuperAdminEmail } from '@/common/roles';
import {
  blogs,
  comments,
  likes,
  newsletterSubscribers,
  notes,
  pageViews,
  users,
} from '@/db/schema';
import type {
  AdminActor,
  AdminRepository,
  AdminUserListQuery,
} from '@/database/repositories/interfaces/admin.repository';
import { buildPaginationMeta } from '@/database/repositories/repository.helpers';
import type { UserRole } from '@/database/types';

@Injectable()
export class PostgresAdminRepository implements AdminRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getStats() {
    const [
      [totalUsers],
      [totalBlogs],
      [totalNotes],
      [totalComments],
      [pageViewCount],
      [totalSubscribers],
      recentUsers,
      recentBlogs,
    ] = await Promise.all([
      this.db.select({ value: count() }).from(users),
      this.db.select({ value: count() }).from(blogs),
      this.db.select({ value: count() }).from(notes),
      this.db.select({ value: count() }).from(comments),
      this.db.select({ value: count() }).from(pageViews),
      this.db.select({ value: count() }).from(newsletterSubscribers),
      this.db.query.users.findMany({
        orderBy: desc(users.createdAt),
        limit: 5,
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
        },
      }),
      this.db.query.blogs.findMany({
        orderBy: desc(blogs.createdAt),
        limit: 5,
        with: { author: { columns: { id: true, name: true, image: true } } },
        columns: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalUsers: totalUsers.value,
      totalBlogs: totalBlogs.value,
      totalNotes: totalNotes.value,
      totalComments: totalComments.value,
      pageViews: pageViewCount.value,
      totalSubscribers: totalSubscribers.value,
      recentUsers,
      recentBlogs,
    };
  }

  async getUsers(query: AdminUserListQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const search = query.search?.trim();
    const where = search
      ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
      : undefined;

    const [rows, [total]] = await Promise.all([
      this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          image: users.image,
          bio: users.bio,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ value: count() }).from(users).where(where),
    ]);

    const enriched = await Promise.all(
      rows.map(async (user) => {
        const [[blogCount], [commentCount]] = await Promise.all([
          this.db
            .select({ value: count() })
            .from(blogs)
            .where(eq(blogs.authorId, user.id)),
          this.db
            .select({ value: count() })
            .from(comments)
            .where(eq(comments.userId, user.id)),
        ]);
        return {
          ...user,
          totalBlogs: blogCount.value,
          totalComments: commentCount.value,
          isSuperAdmin: isSuperAdminEmail(user.email),
        };
      }),
    );

    return {
      users: enriched,
      total: total.value,
      page,
      limit,
      totalPages: buildPaginationMeta(total.value, page, limit).totalPages,
    };
  }

  async changeRole(actor: AdminActor, userId: string, role: UserRole) {
    if (actor.id === userId) {
      return null;
    }

    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || isSuperAdminEmail(user.email)) {
      return null;
    }

    const [updated] = await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });
    return updated ?? null;
  }

  async getAllBlogs() {
    const rows = await this.db.query.blogs.findMany({
      orderBy: desc(blogs.createdAt),
      with: { author: { columns: { id: true, name: true, image: true } } },
    });

    const list = await Promise.all(
      rows.map(async (blog) => {
        const [[commentCount], [likeCount]] = await Promise.all([
          this.db
            .select({ value: count() })
            .from(comments)
            .where(eq(comments.blogId, blog.id)),
          this.db
            .select({ value: count() })
            .from(likes)
            .where(and(eq(likes.blogId, blog.id), eq(likes.type, 'LIKE'))),
        ]);
        return {
          ...blog,
          _count: {
            comments: commentCount.value,
            likes: likeCount.value,
          },
        };
      }),
    );

    return { blogs: list };
  }

  async deleteBlog(blogId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(blogs)
      .where(eq(blogs.id, blogId))
      .returning({ id: blogs.id });
    return deleted.length > 0;
  }

  async getAllNotes() {
    const rows = await this.db.query.notes.findMany({
      orderBy: desc(notes.createdAt),
      with: { subject: true },
    });

    return Promise.all(
      rows.map(async (note) => {
        const [[commentCount], [likeCount]] = await Promise.all([
          this.db
            .select({ value: count() })
            .from(comments)
            .where(eq(comments.noteId, note.id)),
          this.db
            .select({ value: count() })
            .from(likes)
            .where(and(eq(likes.noteId, note.id), eq(likes.type, 'LIKE'))),
        ]);
        return {
          id: note.id,
          title: note.title,
          slug: note.slug,
          subject: note.subject,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          _count: {
            comments: commentCount.value,
            likes: likeCount.value,
          },
        };
      }),
    );
  }
}
