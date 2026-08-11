import { Schema } from 'mongoose';
import type { CommentEntity } from '@/database/types';

export type CommentDocument = CommentEntity;

export const CommentSchema = new Schema<CommentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    text: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    blogId: { type: String, default: null, index: true },
    noteId: { type: String, default: null, index: true },
    parentId: { type: String, default: null, index: true },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'comments',
    versionKey: false,
  },
);
