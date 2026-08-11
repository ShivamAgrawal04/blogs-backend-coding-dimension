import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
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

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

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

  async getUsers(query: { page?: number; limit?: number; search?: string }) {
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
      rows.map(async (u) => {
        const [[blogCount], [commentCount]] = await Promise.all([
          this.db.select({ value: count() }).from(blogs).where(eq(blogs.authorId, u.id)),
          this.db.select({ value: count() }).from(comments).where(eq(comments.userId, u.id)),
        ]);
        return {
          ...u,
          totalBlogs: blogCount.value,
          totalComments: commentCount.value,
          isSuperAdmin: isSuperAdminEmail(u.email),
        };
      }),
    );

    return {
      users: enriched,
      total: total.value,
      page,
      limit,
      totalPages: Math.ceil(total.value / limit),
    };
  }

  async changeRole(
    actor: { id: string; email?: string | null },
    userId: string,
    role: 'USER' | 'ADMIN',
  ) {
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    if (actor.id === userId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundException('User not found');

    if (isSuperAdminEmail(user.email)) {
      throw new ForbiddenException('Super admin role cannot be changed');
    }

    const [updated] = await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });
    return updated;
  }

  async getAllBlogs() {
    const rows = await this.db.query.blogs.findMany({
      orderBy: desc(blogs.createdAt),
      with: { author: { columns: { id: true, name: true, image: true } } },
    });
    const list = await Promise.all(
      rows.map(async (b) => {
        const [[commentCount], [likeCount]] = await Promise.all([
          this.db.select({ value: count() }).from(comments).where(eq(comments.blogId, b.id)),
          this.db
            .select({ value: count() })
            .from(likes)
            .where(and(eq(likes.blogId, b.id), eq(likes.type, 'LIKE'))),
        ]);
        return { ...b, _count: { comments: commentCount.value, likes: likeCount.value } };
      }),
    );
    return { blogs: list };
  }

  async deleteBlog(blogId: string) {
    const [blog] = await this.db.select({ id: blogs.id }).from(blogs).where(eq(blogs.id, blogId)).limit(1);
    if (!blog) throw new NotFoundException('Blog not found');
    await this.db.delete(blogs).where(eq(blogs.id, blogId));
    return { message: 'Blog deleted' };
  }

  async getAllNotes() {
    const rows = await this.db.query.notes.findMany({
      orderBy: desc(notes.createdAt),
      with: { subject: true },
    });
    return Promise.all(
      rows.map(async (n) => {
        const [[commentCount], [likeCount]] = await Promise.all([
          this.db.select({ value: count() }).from(comments).where(eq(comments.noteId, n.id)),
          this.db
            .select({ value: count() })
            .from(likes)
            .where(and(eq(likes.noteId, n.id), eq(likes.type, 'LIKE'))),
        ]);
        return {
          id: n.id,
          title: n.title,
          slug: n.slug,
          subject: n.subject,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          _count: { comments: commentCount.value, likes: likeCount.value },
        };
      }),
    );
  }
}
