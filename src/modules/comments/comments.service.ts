import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  BLOG_REPOSITORY,
  COMMENT_REPOSITORY,
  NOTE_REPOSITORY,
} from '@/database/database.tokens';
import type { BlogRepository } from '@/database/repositories/interfaces/blog.repository';
import type {
  CommentRepository,
  CreateCommentInput,
} from '@/database/repositories/interfaces/comment.repository';
import type { NoteRepository } from '@/database/repositories/interfaces/note.repository';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepository: CommentRepository,
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: BlogRepository,
    @Inject(NOTE_REPOSITORY)
    private readonly noteRepository: NoteRepository,
  ) {}

  async findMany(query: {
    blogId?: string;
    noteId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.commentRepository.list(query);
  }

  async create(
    userId: string,
    dto: { text: string; blogId?: string; noteId?: string; parentId?: string },
  ) {
    if (!dto.blogId && !dto.noteId) {
      throw new BadRequestException('Either blogId or noteId must be provided');
    }

    if (dto.blogId) {
      const blog = await this.blogRepository.findAdminById(dto.blogId);
      if (!blog) throw new NotFoundException('Blog not found');
    }

    if (dto.noteId) {
      const note = await this.noteRepository.findByIdOrSlug(dto.noteId);
      if (!note) throw new NotFoundException('Note not found');
    }

    if (dto.parentId) {
      const parent = await this.commentRepository.findById(dto.parentId);
      if (!parent) throw new NotFoundException('Parent comment not found');
    }

    return this.commentRepository.create(userId, dto as CreateCommentInput);
  }

  async update(id: string, userId: string, text: string) {
    const comment = await this.commentRepository.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new BadRequestException('You can only edit your own comments');
    }

    const updated = await this.commentRepository.update(id, userId, text);
    if (!updated) throw new NotFoundException('Comment not found');
    return updated;
  }

  async delete(id: string, userId: string, userRole: string) {
    const comment = await this.commentRepository.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new BadRequestException('Not authorized to delete this comment');
    }

    await this.commentRepository.delete(id, userId, userRole as any);
    return { message: 'Comment deleted successfully' };
  }
}
