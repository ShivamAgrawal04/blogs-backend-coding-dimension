import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { users } from '@/db/schema';
import { resolveAvatar } from '@/common/avatars';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async getProfile(userId: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        bio: users.bio,
        image: users.image,
        role: users.role,
        dateOfBirth: users.dateOfBirth,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    return { user };
  }

  async updateProfile(
    userId: string,
    dto: {
      name?: string;
      username?: string | null;
      bio?: string;
      image?: string;
      avatarId?: number;
      dateOfBirth?: string | null;
    },
  ) {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');

    let username: string | null | undefined = undefined;
    if (dto.username !== undefined) {
      if (dto.username === null || !String(dto.username).trim()) {
        username = null;
      } else {
        const normalized = String(dto.username).trim().toLowerCase();
        if (!/^[a-z0-9_]{3,30}$/.test(normalized)) {
          throw new ConflictException(
            'Username must be 3–30 characters (letters, numbers, underscore)',
          );
        }
        const [taken] = await this.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, normalized))
          .limit(1);
        if (taken && taken.id !== userId) {
          throw new ConflictException('Username is already taken');
        }
        username = normalized;
      }
    }

    let image: string | undefined;
    if (dto.image !== undefined || dto.avatarId !== undefined) {
      image = resolveAvatar(dto.avatarId, dto.image);
    }

    let dateOfBirth: Date | null | undefined = undefined;
    if (dto.dateOfBirth !== undefined) {
      if (dto.dateOfBirth === null || dto.dateOfBirth === '') {
        dateOfBirth = null;
      } else {
        const parsed = new Date(dto.dateOfBirth);
        if (Number.isNaN(parsed.getTime())) {
          throw new ConflictException('Invalid date of birth');
        }
        dateOfBirth = parsed;
      }
    }

    const [updated] = await this.db
      .update(users)
      .set({
        ...(dto.name !== undefined && { name: dto.name.trim() || null }),
        ...(username !== undefined && { username }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(image !== undefined && { image }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        bio: users.bio,
        image: users.image,
        role: users.role,
        dateOfBirth: users.dateOfBirth,
      });
    return { user: updated };
  }
}
