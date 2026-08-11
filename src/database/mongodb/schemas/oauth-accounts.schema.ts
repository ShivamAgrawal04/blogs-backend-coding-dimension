import { Schema } from 'mongoose';
import type { OAuthAccountEntity } from '@/database/types';

export type OAuthAccountDocument = OAuthAccountEntity;

export const OAuthAccountSchema = new Schema<OAuthAccountDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    expiresAt: { type: Number, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'oauth_accounts',
    versionKey: false,
  },
);

OAuthAccountSchema.index(
  { provider: 1, providerAccountId: 1 },
  { unique: true },
);
