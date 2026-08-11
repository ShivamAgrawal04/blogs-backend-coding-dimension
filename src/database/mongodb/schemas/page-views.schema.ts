import { Schema } from 'mongoose';
import type { PageViewEntity } from '@/database/types';

export type PageViewDocument = PageViewEntity;

export const PageViewSchema = new Schema<PageViewDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    path: { type: String, required: true, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    referer: { type: String, default: null },
    userId: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  {
    collection: 'page_views',
    versionKey: false,
  },
);
