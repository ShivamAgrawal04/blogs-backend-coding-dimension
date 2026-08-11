import { Schema } from 'mongoose';
import type { LikeEntity } from '@/database/types';

export type LikeDocument = LikeEntity;

export const LikeSchema = new Schema<LikeDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    blogId: { type: String, default: null, index: true },
    noteId: { type: String, default: null, index: true },
    commentId: { type: String, default: null, index: true },
    type: { type: String, enum: ['LIKE', 'DISLIKE'], default: 'LIKE' },
    createdAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'likes',
    versionKey: false,
  },
);

LikeSchema.index(
  { userId: 1, blogId: 1 },
  {
    unique: true,
    partialFilterExpression: { blogId: { $type: 'string' } },
  },
);
LikeSchema.index(
  { userId: 1, noteId: 1 },
  {
    unique: true,
    partialFilterExpression: { noteId: { $type: 'string' } },
  },
);
LikeSchema.index(
  { userId: 1, commentId: 1 },
  {
    unique: true,
    partialFilterExpression: { commentId: { $type: 'string' } },
  },
);
