import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isSuperAdminEmail } from '@/common/roles';
import {
  ADMIN_REPOSITORY,
  DB_PROVIDER_TOKEN,
  USER_REPOSITORY,
} from '@/database/database.tokens';
import type { AdminRepository } from '@/database/repositories/interfaces/admin.repository';
import type { UserRepository } from '@/database/repositories/interfaces/user.repository';
import { SettingsService } from '@/database/settings.service';
import type { DbProvider } from '@/database/types';

@Injectable()
export class AdminService {
  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: AdminRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(DB_PROVIDER_TOKEN)
    private readonly activeProvider: DbProvider,
    private readonly settingsService: SettingsService,
  ) {}

  async getStats() {
    return this.adminRepository.getStats();
  }

  async getUsers(query: { page?: number; limit?: number; search?: string }) {
    return this.adminRepository.getUsers(query);
  }

  async changeRole(
    actor: { id: string; email?: string | null },
    userId: string,
    role: 'USER' | 'ADMIN',
  ) {
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    if (actor.id === userId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (isSuperAdminEmail(user.email)) {
      throw new ForbiddenException('Super admin role cannot be changed');
    }

    const updated = await this.userRepository.updateRole(userId, role);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async getAllBlogs() {
    return this.adminRepository.getAllBlogs();
  }

  async deleteBlog(blogId: string) {
    const deleted = await this.adminRepository.deleteBlog(blogId);
    if (!deleted) throw new NotFoundException('Blog not found');
    return { message: 'Blog deleted' };
  }

  async getAllNotes() {
    return this.adminRepository.getAllNotes();
  }

  getDatabaseSettings() {
    const preferred = this.settingsService.getProvider();
    return {
      active: this.activeProvider,
      preferred,
      requiresRestart: preferred !== this.activeProvider,
      options: ['postgres', 'mongodb'] as DbProvider[],
      note: 'Changing the database provider writes data/database-settings.json. Restart the API for it to take effect.',
    };
  }

  updateDatabaseProvider(provider: DbProvider) {
    if (provider !== 'postgres' && provider !== 'mongodb') {
      throw new BadRequestException('provider must be postgres or mongodb');
    }
    this.settingsService.setProvider(provider);
    return {
      active: this.activeProvider,
      preferred: provider,
      requiresRestart: provider !== this.activeProvider,
      message:
        provider === this.activeProvider
          ? `Already using ${provider}.`
          : `Preferred database set to ${provider}. Restart the backend to apply.`,
    };
  }
}
