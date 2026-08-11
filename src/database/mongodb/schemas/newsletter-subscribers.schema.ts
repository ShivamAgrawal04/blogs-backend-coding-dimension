import { Schema } from 'mongoose';
import type { NewsletterSubscriberEntity } from '@/database/types';

export type NewsletterSubscriberDocument = NewsletterSubscriberEntity;

export const NewsletterSubscriberSchema = new Schema<NewsletterSubscriberDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: null },
    active: { type: Boolean, default: true },
    token: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'newsletter_subscribers',
    versionKey: false,
  },
);
