import { Schema } from 'mongoose';
import type { ReadHistoryEntity } from '@/database/types';

export type ReadHistoryDocument = ReadHistoryEntity;

export const ReadHistorySchema = new Schema<ReadHistoryDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    blogId: { type: String, default: null, index: true },
    noteId: { type: String, default: null, index: true },
    readAt: { type: Date, default: () => new Date() },
    progress: { type: Number, default: 0 },
  },
  {
    collection: 'read_history',
    versionKey: false,
  },
);
