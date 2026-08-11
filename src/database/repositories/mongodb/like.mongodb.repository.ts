import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createId } from '@paralleldrive/cuid2';
import { Model } from 'mongoose';
import { LIKE_MODEL } from '@/database/mongodb/schemas';
import type { LikeDocument } from '@/database/mongodb/schemas/likes.schema';
import type {
  LikeRepository,
  ReactionTargetInput,
} from '@/database/repositories/interfaces/like.repository';
import type { ReactionType } from '@/database/types';

@Injectable()
export class MongoLikeRepository implements LikeRepository {
  constructor(
    @InjectModel(LIKE_MODEL)
    private readonly likeModel: Model<LikeDocument>,
  ) {}

  async toggle(userId: string, input: ReactionTargetInput) {
    const type: ReactionType = input.type ?? 'LIKE';
    const target = this.targetFilter(input);
    const existing = await this.likeModel.findOne({ userId, ...target }).lean().exec();

    if (existing) {
      if (existing.type === type) {
        await this.likeModel.deleteOne({ id: existing.id }).exec();
        const reactionCount = await this.count({ ...input, type });
        return { active: false, liked: false, type, count: reactionCount };
      }

      await this.likeModel.updateOne({ id: existing.id }, { type }).exec();
      const reactionCount = await this.count({ ...input, type });
      return {
        active: true,
        liked: type === 'LIKE',
        type,
        count: reactionCount,
      };
    }

    await this.likeModel.create({
      id: createId(),
      userId,
      blogId: input.blogId ?? null,
      noteId: input.noteId ?? null,
      commentId: input.commentId ?? null,
      type,
      createdAt: new Date(),
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
    return this.likeModel.countDocuments({ type, ...this.targetFilter(input) }).exec();
  }

  private targetFilter(input: ReactionTargetInput) {
    if (input.blogId) return { blogId: input.blogId };
    if (input.noteId) return { noteId: input.noteId };
    if (input.commentId) return { commentId: input.commentId };
    throw new BadRequestException('blogId, noteId, or commentId is required');
  }
}
