import { Schema } from 'mongoose';
import type { BookmarkEntity } from '@/database/types';

export type BookmarkDocument = BookmarkEntity;

export const BookmarkSchema = new Schema<BookmarkDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    blogId: { type: String, default: null, index: true },
    noteId: { type: String, default: null, index: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'bookmarks',
    versionKey: false,
  },
);

BookmarkSchema.index(
  { userId: 1, blogId: 1 },
  {
    unique: true,
    partialFilterExpression: { blogId: { $type: 'string' } },
  },
);
BookmarkSchema.index(
  { userId: 1, noteId: 1 },
  {
    unique: true,
    partialFilterExpression: { noteId: { $type: 'string' } },
  },
);
