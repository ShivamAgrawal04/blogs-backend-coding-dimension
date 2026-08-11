import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, count, eq, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { likes } from '@/db/schema';
import type {
  LikeRepository,
  ReactionTargetInput,
} from '@/database/repositories/interfaces/like.repository';
import type { ReactionType } from '@/database/types';

@Injectable()
export class PostgresLikeRepository implements LikeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async toggle(userId: string, input: ReactionTargetInput) {
    const type: ReactionType = input.type ?? 'LIKE';
    const target = this.targetCondition(input);
    const [existing] = await this.db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), target))
      .limit(1);

    if (existing) {
      if (existing.type === type) {
        await this.db.delete(likes).where(eq(likes.id, existing.id));
        const reactionCount = await this.count({ ...input, type });
        return { active: false, liked: false, type, count: reactionCount };
      }

      await this.db.update(likes).set({ type }).where(eq(likes.id, existing.id));
      const reactionCount = await this.count({ ...input, type });
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
      blogId: input.blogId ?? null,
      noteId: input.noteId ?? null,
      commentId: input.commentId ?? null,
      type,
    });

    const reactionCount = await this.count({ ...input, type });
    return {
      active: true,
      liked: type === 'LIKE',
      type,
      count: reactionCount,
    };
  }

  async count(input: ReactionTargetInput): Promise<number> {
    const type: ReactionType = input.type ?? 'LIKE';
    const [result] = await this.db
      .select({ value: count() })
      .from(likes)
      .where(and(eq(likes.type, type), this.targetCondition(input)));
    return result?.value ?? 0;
  }

  private targetCondition(input: ReactionTargetInput): SQL {
    if (input.blogId) return eq(likes.blogId, input.blogId);
    if (input.noteId) return eq(likes.noteId, input.noteId);
    if (input.commentId) return eq(likes.commentId, input.commentId);
    throw new BadRequestException('blogId, noteId, or commentId is required');
  }
}
