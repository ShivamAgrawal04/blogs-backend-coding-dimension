import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import {
  blogs,
  comments as commentsTable,
  likes,
  notes,
  users,
} from '@/db/schema';

@Injectable()
export class CommentsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findMany(query: {
    blogId?: string;
    noteId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const conditions: SQL[] = [isNull(commentsTable.parentId)];
    if (query.blogId) conditions.push(eq(commentsTable.blogId, query.blogId));
    else if (query.noteId) conditions.push(eq(commentsTable.noteId, query.noteId));
    const where = and(...conditions);

    const [rows, total] = await Promise.all([
      this.db
        .select({
          comment: commentsTable,
          user: { id: users.id, name: users.name, image: users.image },
        })
        .from(commentsTable)
        .innerJoin(users, eq(commentsTable.userId, users.id))
        .where(where)
        .orderBy(desc(commentsTable.createdAt))
        .limit(limit)
        .offset(skip),
      this.db.select({ value: count() }).from(commentsTable).where(where),
    ]);

    const formatted = await Promise.all(
      rows.map(async ({ comment, user }) => {
        const replies = await this.db
          .select({
            comment: commentsTable,
            user: { id: users.id, name: users.name, image: users.image },
          })
          .from(commentsTable)
          .innerJoin(users, eq(commentsTable.userId, users.id))
          .where(eq(commentsTable.parentId, comment.id))
          .orderBy(asc(commentsTable.createdAt));

        const [likeCount] = await this.db
          .select({ value: count() })
          .from(likes)
          .where(eq(likes.commentId, comment.id));

        return {
          ...comment,
          user,
          replies: await Promise.all(
            replies.map(async (reply) => {
              const [replyLikes] = await this.db
                .select({ value: count() })
                .from(likes)
                .where(eq(likes.commentId, reply.comment.id));
              return {
                ...reply.comment,
                user: reply.user,
                _count: { likes: replyLikes.value },
              };
            }),
          ),
          _count: { likes: likeCount.value },
        };
      }),
    );

    return {
      comments: formatted,
      pagination: {
        total: total[0].value,
        page,
        limit,
        totalPages: Math.ceil(total[0].value / limit),
      },
    };
  }

  async create(
    userId: string,
    dto: { text: string; blogId?: string; noteId?: string; parentId?: string },
  ) {
    if (!dto.blogId && !dto.noteId) {
      throw new BadRequestException('Either blogId or noteId must be provided');
    }

    if (dto.blogId) {
      const [blog] = await this.db
        .select({ id: blogs.id })
        .from(blogs)
        .where(eq(blogs.id, dto.blogId))
        .limit(1);
      if (!blog) throw new NotFoundException('Blog not found');
    }

    if (dto.noteId) {
      const [note] = await this.db
        .select({ id: notes.id })
        .from(notes)
        .where(eq(notes.id, dto.noteId))
        .limit(1);
      if (!note) throw new NotFoundException('Note not found');
    }

    if (dto.parentId) {
      const [parent] = await this.db
        .select()
        .from(commentsTable)
        .where(eq(commentsTable.id, dto.parentId))
        .limit(1);
      if (!parent) throw new NotFoundException('Parent comment not found');
    }

    const [comment] = await this.db
      .insert(commentsTable)
      .values({
        id: createId(),
        text: dto.text,
        userId,
        blogId: dto.blogId ?? null,
        noteId: dto.noteId ?? null,
        parentId: dto.parentId ?? null,
      })
      .returning();

    return this.withUserAndCount(comment);
  }

  async update(id: string, userId: string, text: string) {
    const [comment] = await this.db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new BadRequestException('You can only edit your own comments');
    }

    const [updated] = await this.db
      .update(commentsTable)
      .set({ text, updatedAt: new Date() })
      .where(eq(commentsTable.id, id))
      .returning();
    return this.withUserAndCount(updated);
  }

  async delete(id: string, userId: string, userRole: string) {
    const [comment] = await this.db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new BadRequestException('Not authorized to delete this comment');
    }

    await this.db.delete(commentsTable).where(eq(commentsTable.id, id));
    return { message: 'Comment deleted successfully' };
  }

  private async withUserAndCount(comment: typeof commentsTable.$inferSelect) {
    const [[user], [likeCount]] = await Promise.all([
      this.db
        .select({ id: users.id, name: users.name, image: users.image })
        .from(users)
        .where(eq(users.id, comment.userId))
        .limit(1),
      this.db.select({ value: count() }).from(likes).where(eq(likes.commentId, comment.id)),
    ]);
    return { ...comment, user, _count: { likes: likeCount.value } };
  }
}
