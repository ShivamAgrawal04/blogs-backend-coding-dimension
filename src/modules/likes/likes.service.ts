import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LIKE_REPOSITORY } from '@/database/database.tokens';
import type {
  LikeRepository,
  ReactionTargetInput,
} from '@/database/repositories/interfaces/like.repository';

type ReactionType = 'LIKE' | 'DISLIKE';

@Injectable()
export class LikesService {
  constructor(
    @Inject(LIKE_REPOSITORY)
    private readonly likeRepository: LikeRepository,
  ) {}

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
    return this.likeRepository.toggle(userId, dto as ReactionTargetInput);
  }

  async getLikeCount(dto: {
    blogId?: string;
    noteId?: string;
    commentId?: string;
    type?: 'LIKE' | 'DISLIKE';
  }): Promise<number> {
    return this.likeRepository.count(dto as ReactionTargetInput);
  }
}
