import { Schema } from 'mongoose';
import type { UserEntity } from '@/database/types';

export type UserDocument = UserEntity;

export const UserSchema = new Schema<UserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: null },
    username: { type: String, default: null },
    email: { type: String, required: true, unique: true, index: true },
    emailVerified: { type: Date, default: null },
    image: { type: String, default: null },
    password: { type: String, default: null },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    bio: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'users',
    versionKey: false,
  },
);

UserSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { username: { $type: 'string' } },
  },
);
