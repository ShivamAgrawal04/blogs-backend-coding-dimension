import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import {
  comments as commentsTable,
  likes,
  users,
} from '@/db/schema';
import type {
  CommentRepository,
  CreateCommentInput,
} from '@/database/repositories/interfaces/comment.repository';
import { buildPaginationMeta } from '@/database/repositories/repository.helpers';
import type { CommentEntity, UserRole } from '@/database/types';

@Injectable()
export class PostgresCommentRepository implements CommentRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(query: { blogId?: string; noteId?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;
    const conditions: SQL[] = [isNull(commentsTable.parentId)];

    if (query.blogId) {
      conditions.push(eq(commentsTable.blogId, query.blogId));
    } else if (query.noteId) {
      conditions.push(eq(commentsTable.noteId, query.noteId));
    }

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

    const comments = await Promise.all(
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
                _count: { likes: replyLikes?.value ?? 0 },
              };
            }),
          ),
          _count: { likes: likeCount?.value ?? 0 },
        };
      }),
    );

    return {
      comments,
      pagination: buildPaginationMeta(total[0]?.value ?? 0, page, limit),
    };
  }

  async create(userId: string, input: CreateCommentInput) {
    const [comment] = await this.db
      .insert(commentsTable)
      .values({
        id: createId(),
        text: input.text,
        userId,
        blogId: input.blogId ?? null,
        noteId: input.noteId ?? null,
        parentId: input.parentId ?? null,
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
    if (!comment || comment.userId !== userId) {
      return null;
    }

    const [updated] = await this.db
      .update(commentsTable)
      .set({ text, updatedAt: new Date() })
      .where(eq(commentsTable.id, id))
      .returning();
    return this.withUserAndCount(updated);
  }

  async delete(id: string, userId: string, userRole: UserRole): Promise<boolean> {
    const [comment] = await this.db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);
    if (!comment || (comment.userId !== userId && userRole !== 'ADMIN')) {
      return false;
    }

    await this.db.delete(commentsTable).where(eq(commentsTable.id, id));
    return true;
  }

  async findById(id: string): Promise<CommentEntity | null> {
    const [comment] = await this.db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);
    return comment ?? null;
  }

  private async withUserAndCount(comment: CommentEntity) {
    const [[user], [likeCount]] = await Promise.all([
      this.db
        .select({ id: users.id, name: users.name, image: users.image })
        .from(users)
        .where(eq(users.id, comment.userId))
        .limit(1),
      this.db
        .select({ value: count() })
        .from(likes)
        .where(eq(likes.commentId, comment.id)),
    ]);

    return {
      ...comment,
      user,
      _count: { likes: likeCount?.value ?? 0 },
    };
  }
}
