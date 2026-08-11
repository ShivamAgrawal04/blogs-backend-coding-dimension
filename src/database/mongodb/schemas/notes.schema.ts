import { Schema } from 'mongoose';
import type { NoteEntity } from '@/database/types';

export type NoteDocument = NoteEntity;

export const NoteSchema = new Schema<NoteDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true, default: '' },
    content: { type: String, required: true },
    date: { type: Date, default: () => new Date() },
    readTime: { type: String, required: true },
    views: { type: Number, default: 0 },
    subjectId: { type: String, required: true, index: true },
    sortOrder: { type: Number, default: 0 },
    metaTitle: { type: String, default: null },
    metaDescription: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'notes',
    versionKey: false,
  },
);

NoteSchema.index({ subjectId: 1, slug: 1 }, { unique: true });
