import type { ReactionType } from '@/database/types';

export interface ReactionTargetInput {
  blogId?: string;
  noteId?: string;
  commentId?: string;
  type?: ReactionType;
}

export interface LikeRepository {
  toggle(userId: string, input: ReactionTargetInput): Promise<{
    active: boolean;
    liked: boolean;
    type: ReactionType;
    count: number;
  }>;
  count(input: ReactionTargetInput): Promise<number>;
}
