import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { DbProvider } from '@/database/types';

export const DATABASE_SETTINGS_PATH = join(
  process.cwd(),
  'data',
  'database-settings.json',
);

function parseProvider(value: unknown): DbProvider | null {
  return value === 'postgres' || value === 'mongodb' ? value : null;
}

export function resolveDbProvider(): DbProvider {
  if (existsSync(DATABASE_SETTINGS_PATH)) {
    try {
      const raw = readFileSync(DATABASE_SETTINGS_PATH, 'utf8');
      const parsed = JSON.parse(raw) as { provider?: unknown };
      const fileProvider = parseProvider(parsed.provider);
      if (fileProvider) {
        return fileProvider;
      }
    } catch {
      // Fall back to env/default when settings file is unreadable.
    }
  }

  const envProvider = parseProvider(process.env.DB_PROVIDER);
  if (envProvider) {
    return envProvider;
  }

  return 'postgres';
}

export function writeDbProvider(provider: DbProvider) {
  mkdirSync(dirname(DATABASE_SETTINGS_PATH), { recursive: true });
  writeFileSync(
    DATABASE_SETTINGS_PATH,
    `${JSON.stringify({ provider }, null, 2)}\n`,
    'utf8',
  );
}
