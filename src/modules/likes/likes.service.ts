import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, count, eq, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { likes } from '@/db/schema';

type ReactionType = 'LIKE' | 'DISLIKE';

@Injectable()
export class LikesService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async toggle(
    userId: string,
    dto: {
      blogId?: string;
      noteId?: string;
      commentId?: string;
      type?: 'LIKE' | 'DISLIKE';
    },
  ) {
    if (!dto.blogId && !dto.noteId && !dto.commentId) {
      throw new BadRequestException('blogId, noteId, or commentId is required');
    }

    const type: ReactionType = dto.type || 'LIKE';
    const target = this.targetCondition(dto);
    const [existing] = await this.db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), target))
      .limit(1);

    if (existing) {
      if (existing.type === type) {
        await this.db.delete(likes).where(eq(likes.id, existing.id));
        const reactionCount = await this.getLikeCount({ ...dto, type });
        return { active: false, liked: false, type, count: reactionCount };
      }
      await this.db.update(likes).set({ type }).where(eq(likes.id, existing.id));
      const reactionCount = await this.getLikeCount({ ...dto, type });
      return {
        active: true,
        liked: type === 'LIKE',
        type,
        count: reactionCount,
      };
    }

    await this.db.insert(likes).values({
      id: createId(),
      userId,
      blogId: dto.blogId ?? null,
      noteId: dto.noteId ?? null,
      commentId: dto.commentId ?? null,
      type,
    });

    const reactionCount = await this.getLikeCount({ ...dto, type });
    return {
      active: true,
      liked: type === 'LIKE',
      type,
      count: reactionCount,
    };
  }

  async getLikeCount(dto: {
    blogId?: string;
    noteId?: string;
    commentId?: string;
    type?: 'LIKE' | 'DISLIKE';
  }): Promise<number> {
    const type: ReactionType = dto.type || 'LIKE';
    const [result] = await this.db
      .select({ value: count() })
      .from(likes)
      .where(and(eq(likes.type, type), this.targetCondition(dto)));
    return result.value;
  }

  private targetCondition(dto: {
    blogId?: string;
    noteId?: string;
    commentId?: string;
  }): SQL {
    if (dto.blogId) return eq(likes.blogId, dto.blogId);
    if (dto.noteId) return eq(likes.noteId, dto.noteId);
    if (dto.commentId) return eq(likes.commentId, dto.commentId);
    throw new BadRequestException('blogId, noteId, or commentId is required');
  }
}
