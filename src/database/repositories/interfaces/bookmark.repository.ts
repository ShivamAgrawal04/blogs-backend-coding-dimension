export interface BookmarkTargetInput {
  blogId?: string;
  noteId?: string;
}

export interface BookmarkRepository {
  toggle(
    userId: string,
    input: BookmarkTargetInput,
  ): Promise<{ bookmarked: boolean }>;
  getUserBookmarks(userId: string): Promise<any[]>;
  isBookmarked(userId: string, blogId?: string, noteId?: string): Promise<boolean>;
}
