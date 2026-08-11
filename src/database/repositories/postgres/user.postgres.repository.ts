import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { users } from '@/db/schema';
import type {
  CreateUserInput,
  PublicUserProfile,
  UpdateUserProfileInput,
  UserRepository,
  UserRoleRecord,
} from '@/database/repositories/interfaces/user.repository';
import type { UserEntity, UserRole } from '@/database/types';

const publicUserColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  email: users.email,
  role: users.role,
  bio: users.bio,
  image: users.image,
  dateOfBirth: users.dateOfBirth,
  createdAt: users.createdAt,
} as const;

@Injectable()
export class PostgresUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<UserEntity | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user ?? null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user ?? null;
  }

  async getPublicProfile(id: string): Promise<PublicUserProfile | null> {
    const [user] = await this.db
      .select(publicUserColumns)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }

  async create(input: CreateUserInput): Promise<PublicUserProfile> {
    const [user] = await this.db
      .insert(users)
      .values({
        id: input.id,
        name: input.name,
        username: input.username ?? null,
        email: input.email.toLowerCase(),
        password: input.password,
        image: input.image,
        emailVerified: input.emailVerified ?? null,
        role: input.role ?? 'USER',
        bio: input.bio ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
      })
      .returning(publicUserColumns);
    return user;
  }

  async updateProfile(
    id: string,
    input: UpdateUserProfileInput,
  ): Promise<PublicUserProfile | null> {
    const [user] = await this.db
      .update(users)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.username !== undefined && { username: input.username }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.image !== undefined && { image: input.image }),
        ...(input.dateOfBirth !== undefined && {
          dateOfBirth: input.dateOfBirth,
        }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning(publicUserColumns);
    return user ?? null;
  }

  async updateRole(id: string, role: UserRole): Promise<UserRoleRecord | null> {
    const [user] = await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });
    return user ?? null;
  }
}
