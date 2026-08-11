import { Injectable } from '@nestjs/common';
import { resolveDbProvider, writeDbProvider } from '@/database/provider';
import type { DbProvider } from '@/database/types';

@Injectable()
export class SettingsService {
  getProvider(): DbProvider {
    return resolveDbProvider();
  }

  setProvider(provider: DbProvider): DbProvider {
    writeDbProvider(provider);
    return provider;
  }
}
