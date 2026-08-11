import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BOOKMARK_REPOSITORY } from '@/database/database.tokens';
import type {
  BookmarkRepository,
  BookmarkTargetInput,
} from '@/database/repositories/interfaces/bookmark.repository';

@Injectable()
export class BookmarksService {
  constructor(
    @Inject(BOOKMARK_REPOSITORY)
    private readonly bookmarkRepository: BookmarkRepository,
  ) {}

  async toggle(userId: string, dto: { blogId?: string; noteId?: string }) {
    return this.bookmarkRepository.toggle(userId, dto as BookmarkTargetInput);
  }

  async getUserBookmarks(userId: string) {
    return this.bookmarkRepository.getUserBookmarks(userId);
  }

  async isBookmarked(
    userId: string,
    blogId?: string,
    noteId?: string,
  ): Promise<boolean> {
    if (!blogId && !noteId) {
      throw new BadRequestException('blogId or noteId is required');
    }
    return this.bookmarkRepository.isBookmarked(userId, blogId, noteId);
  }
}
