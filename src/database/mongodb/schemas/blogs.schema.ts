import { Schema } from 'mongoose';
import type { BlogEntity } from '@/database/types';

export type BlogDocument = BlogEntity;

export const BlogSchema = new Schema<BlogDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    readTime: { type: String, required: true, default: '' },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    featured: { type: Boolean, default: false },
    imageGradient: {
      type: String,
      default: 'from-[#033b2a] to-[#1e4d3a]',
    },
    metaTitle: { type: String, default: null },
    metaDescription: { type: String, default: null },
    views: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'blogs',
    versionKey: false,
  },
);
