import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createId } from '@paralleldrive/cuid2';
import { Model } from 'mongoose';
import {
  COMMENT_MODEL,
  LIKE_MODEL,
  USER_MODEL,
} from '@/database/mongodb/schemas';
import { stripMongoMeta, stripMongoMetaArray } from '@/database/mongodb/mongo.helpers';
import type { CommentDocument } from '@/database/mongodb/schemas/comments.schema';
import type { LikeDocument } from '@/database/mongodb/schemas/likes.schema';
import type { UserDocument } from '@/database/mongodb/schemas/users.schema';
import type {
  CommentRepository,
  CreateCommentInput,
} from '@/database/repositories/interfaces/comment.repository';
import { buildPaginationMeta } from '@/database/repositories/repository.helpers';
import type { CommentEntity, UserRole } from '@/database/types';

@Injectable()
export class MongoCommentRepository implements CommentRepository {
  constructor(
    @InjectModel(COMMENT_MODEL)
    private readonly commentModel: Model<CommentDocument>,
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(LIKE_MODEL)
    private readonly likeModel: Model<LikeDocument>,
  ) {}

  async list(query: { blogId?: string; noteId?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const filter: Record<string, unknown> = { parentId: null };

    if (query.blogId) {
      filter.blogId = query.blogId;
    } else if (query.noteId) {
      filter.noteId = query.noteId;
    }

    const [rows, total] = await Promise.all([
      this.commentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<CommentEntity[]>()
        .exec(),
      this.commentModel.countDocuments(filter).exec(),
    ]);

    const comments = await Promise.all(rows.map((comment) => this.formatComment(comment)));
    return {
      comments,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  async create(userId: string, input: CreateCommentInput) {
    const document = await this.commentModel.create({
      id: createId(),
      text: input.text,
      userId,
      blogId: input.blogId ?? null,
      noteId: input.noteId ?? null,
      parentId: input.parentId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this.withUserAndCount(stripMongoMeta(document.toObject()) as CommentEntity);
  }

  async update(id: string, userId: string, text: string) {
    const existing = await this.commentModel.findOne({ id }).lean<CommentEntity>().exec();
    if (!existing || existing.userId !== userId) {
      return null;
    }

    const updated = await this.commentModel
      .findOneAndUpdate(
        { id },
        { $set: { text, updatedAt: new Date() } },
        { new: true },
      )
      .lean<CommentEntity>()
      .exec();
    return updated ? this.withUserAndCount(updated) : null;
  }

  async delete(id: string, userId: string, userRole: UserRole): Promise<boolean> {
    const existing = await this.commentModel.findOne({ id }).lean<CommentEntity>().exec();
    if (!existing || (existing.userId !== userId && userRole !== 'ADMIN')) {
      return false;
    }

    await Promise.all([
      this.likeModel.deleteMany({ commentId: id }).exec(),
      this.commentModel.deleteOne({ id }).exec(),
    ]);
    return true;
  }

  async findById(id: string): Promise<CommentEntity | null> {
    return stripMongoMeta(
      await this.commentModel.findOne({ id }).lean<CommentEntity>().exec(),
    );
  }

  private async formatComment(comment: CommentEntity) {
    const [user, replies, likeCount] = await Promise.all([
      this.userModel
        .findOne({ id: comment.userId }, { _id: 0, id: 1, name: 1, image: 1 })
        .lean()
        .exec(),
      this.commentModel
        .find({ parentId: comment.id })
        .sort({ createdAt: 1 })
        .lean<CommentEntity[]>()
        .exec(),
      this.likeModel.countDocuments({ commentId: comment.id }).exec(),
    ]);

    return {
      ...comment,
      user: stripMongoMeta(user),
      replies: await Promise.all(
        replies.map(async (reply) => {
          const [replyUser, replyLikes] = await Promise.all([
            this.userModel
              .findOne({ id: reply.userId }, { _id: 0, id: 1, name: 1, image: 1 })
              .lean()
              .exec(),
            this.likeModel.countDocuments({ commentId: reply.id }).exec(),
          ]);
          return {
            ...reply,
            user: stripMongoMeta(replyUser),
            _count: { likes: replyLikes },
          };
        }),
      ),
      _count: { likes: likeCount },
    };
  }

  private async withUserAndCount(comment: CommentEntity) {
    const [user, likeCount] = await Promise.all([
      this.userModel
        .findOne({ id: comment.userId }, { _id: 0, id: 1, name: 1, image: 1 })
        .lean()
        .exec(),
      this.likeModel.countDocuments({ commentId: comment.id }).exec(),
    ]);

    return {
      ...comment,
      user: stripMongoMeta(user),
      _count: { likes: likeCount },
    };
  }
}
