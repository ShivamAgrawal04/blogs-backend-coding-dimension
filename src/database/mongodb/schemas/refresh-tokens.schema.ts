import { Schema } from 'mongoose';
import type { RefreshTokenEntity } from '@/database/types';

export type RefreshTokenDocument = RefreshTokenEntity;

export const RefreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: () => new Date() },
    revokedAt: { type: Date, default: null },
  },
  {
    collection: 'refresh_tokens',
    versionKey: false,
  },
);
