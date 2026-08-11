import { Schema } from 'mongoose';
import type { BlogTagEntity } from '@/database/types';

export type BlogTagDocument = BlogTagEntity;

export const BlogTagSchema = new Schema<BlogTagDocument>(
  {
    blogId: { type: String, required: true, index: true },
    tagId: { type: String, required: true, index: true },
  },
  {
    collection: 'blog_tags',
    versionKey: false,
  },
);

BlogTagSchema.index({ blogId: 1, tagId: 1 }, { unique: true });
