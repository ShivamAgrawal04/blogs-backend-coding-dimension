import type { CommentEntity, UserRole } from '@/database/types';

export interface CommentListQuery {
  blogId?: string;
  noteId?: string;
  page?: number;
  limit?: number;
}

export interface CreateCommentInput {
  text: string;
  blogId?: string;
  noteId?: string;
  parentId?: string;
}

export interface CommentRepository {
  list(query: CommentListQuery): Promise<any>;
  create(userId: string, input: CreateCommentInput): Promise<any>;
  update(id: string, userId: string, text: string): Promise<any | null>;
  delete(id: string, userId: string, userRole: UserRole): Promise<boolean>;
  findById(id: string): Promise<CommentEntity | null>;
}
