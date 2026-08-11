import { Schema } from 'mongoose';
import type { TagEntity } from '@/database/types';

export type TagDocument = TagEntity;

export const TagSchema = new Schema<TagDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
  },
  {
    collection: 'tags',
    versionKey: false,
  },
);
