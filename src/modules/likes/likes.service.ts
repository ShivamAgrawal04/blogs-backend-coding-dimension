import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReactionType } from '@prisma/client';

@Injectable()
export class LikesService {
  constructor(private prisma: PrismaService) {}

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

    const type = (dto.type as ReactionType) || ReactionType.LIKE;
    const where: Record<string, unknown> = { userId };

    if (dto.blogId) where.blogId = dto.blogId;
    else if (dto.noteId) where.noteId = dto.noteId;
    else if (dto.commentId) where.commentId = dto.commentId;

    const existing = await this.prisma.like.findFirst({ where });

    if (existing) {
      if (existing.type === type) {
        await this.prisma.like.delete({ where: { id: existing.id } });
        const count = await this.getLikeCount(dto);
        return { liked: false, type, count };
      }
      await this.prisma.like.update({
        where: { id: existing.id },
        data: { type },
      });
      const count = await this.getLikeCount(dto);
      return { liked: type === ReactionType.LIKE, type, count };
    }

    await this.prisma.like.create({
      data: {
        userId,
        blogId: dto.blogId,
        noteId: dto.noteId,
        commentId: dto.commentId,
        type,
      },
    });

    const count = await this.getLikeCount(dto);
    return { liked: type === ReactionType.LIKE, type, count };
  }

  async getLikeCount(dto: {
    blogId?: string;
    noteId?: string;
    commentId?: string;
    type?: 'LIKE' | 'DISLIKE';
  }): Promise<number> {
    const where: Record<string, unknown> = {
      type: (dto.type as ReactionType) || ReactionType.LIKE,
    };

    if (dto.blogId) where.blogId = dto.blogId;
    else if (dto.noteId) where.noteId = dto.noteId;
    else if (dto.commentId) where.commentId = dto.commentId;

    return this.prisma.like.count({ where });
  }
}
