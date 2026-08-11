import { Schema } from 'mongoose';
import type { SubjectEntity } from '@/database/types';

export type SubjectDocument = SubjectEntity;

export const SubjectSchema = new Schema<SubjectDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    icon: { type: String, required: true, default: '??' },
    sortOrder: { type: Number, default: 0 },
  },
  {
    collection: 'subjects',
    versionKey: false,
  },
);
