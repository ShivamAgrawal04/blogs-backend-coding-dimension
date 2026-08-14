import { BadRequestException, Injectable } from '@nestjs/common';
import { resolveDbProvider, writeDbProvider } from '@/database/provider';
import type { DbProvider } from '@/database/types';

@Injectable()
export class SettingsService {
  private active: DbProvider;

  constructor() {
    const preferred = resolveDbProvider();
    const available = this.getAvailableProviders();
    this.active = available.includes(preferred)
      ? preferred
      : available[0] ?? 'postgres';
  }

  getProvider(): DbProvider {
    return this.active;
  }

  getAvailableProviders(): DbProvider[] {
    const providers: DbProvider[] = [];
    if (process.env.DATABASE_URL?.trim()) providers.push('postgres');
    if (process.env.MONGODB_URI?.trim()) providers.push('mongodb');
    return providers;
  }

  isAvailable(provider: DbProvider): boolean {
    return this.getAvailableProviders().includes(provider);
  }

  /** Hot-switch active DB immediately + persist for next boot. */
  setProvider(provider: DbProvider): DbProvider {
    if (provider !== 'postgres' && provider !== 'mongodb') {
      throw new BadRequestException('provider must be postgres or mongodb');
    }
    if (!this.isAvailable(provider)) {
      const missing =
        provider === 'postgres' ? 'DATABASE_URL' : 'MONGODB_URI';
      throw new BadRequestException(
        `${provider} is not configured. Set ${missing} in .env (keep both URIs set to switch anytime).`,
      );
    }
    this.active = provider;
    writeDbProvider(provider);
    return provider;
  }
}
