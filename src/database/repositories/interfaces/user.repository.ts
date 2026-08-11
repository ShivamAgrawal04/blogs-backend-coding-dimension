import type { UserEntity, UserRole } from '@/database/types';

export type PublicUserProfile = Pick<
  UserEntity,
  'id' | 'name' | 'username' | 'email' | 'bio' | 'image' | 'role' | 'dateOfBirth' | 'createdAt'
>;

export interface CreateUserInput {
  id: string;
  name: string | null;
  username?: string | null;
  email: string;
  password: string | null;
  image: string | null;
  emailVerified?: Date | null;
  role?: UserRole;
  bio?: string | null;
  dateOfBirth?: Date | null;
}

export interface UpdateUserProfileInput {
  name?: string | null;
  username?: string | null;
  bio?: string | null;
  image?: string | null;
  dateOfBirth?: Date | null;
}

export type UserRoleRecord = Pick<UserEntity, 'id' | 'name' | 'email' | 'role'>;

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  getPublicProfile(id: string): Promise<PublicUserProfile | null>;
  create(input: CreateUserInput): Promise<PublicUserProfile>;
  updateProfile(
    id: string,
    input: UpdateUserProfileInput,
  ): Promise<PublicUserProfile | null>;
  updateRole(id: string, role: UserRole): Promise<UserRoleRecord | null>;
}
