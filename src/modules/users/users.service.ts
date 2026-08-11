import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { resolveAvatar } from '@/common/avatars';
import { USER_REPOSITORY } from '@/database/database.tokens';
import type {
  UpdateUserProfileInput,
  UserRepository,
} from '@/database/repositories/interfaces/user.repository';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.getPublicProfile(userId);
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
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    let username: string | null | undefined;
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
        const taken = await this.userRepository.findByUsername(normalized);
        if (taken && taken.id !== userId) {
          throw new ConflictException('Username is already taken');
        }
        username = normalized;
      }
    }

    let image: string | null | undefined;
    if (dto.image !== undefined || dto.avatarId !== undefined) {
      image = resolveAvatar(dto.avatarId, dto.image);
    }

    let dateOfBirth: Date | null | undefined;
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

    const updated = await this.userRepository.updateProfile(userId, {
      ...(dto.name !== undefined && { name: dto.name.trim() || null }),
      ...(username !== undefined && { username }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(image !== undefined && { image }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
    } as UpdateUserProfileInput);
    if (!updated) throw new NotFoundException('User not found');
    return { user: updated };
  }
}
