import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export type PcloudSettings = {
  accessToken: string;
  apiHost: string;
  uid?: number;
  connectedAt?: string;
};

export const PCLOUD_SETTINGS_PATH = join(
  process.cwd(),
  'data',
  'pcloud-settings.json',
);

export function readPcloudSettings(): PcloudSettings | null {
  if (!existsSync(PCLOUD_SETTINGS_PATH)) return null;
  try {
    const parsed = JSON.parse(
      readFileSync(PCLOUD_SETTINGS_PATH, 'utf8'),
    ) as Partial<PcloudSettings>;
    if (!parsed.accessToken) return null;
    return {
      accessToken: parsed.accessToken,
      apiHost: parsed.apiHost || 'api.pcloud.com',
      uid: parsed.uid,
      connectedAt: parsed.connectedAt,
    };
  } catch {
    return null;
  }
}

export function writePcloudSettings(settings: PcloudSettings) {
  mkdirSync(dirname(PCLOUD_SETTINGS_PATH), { recursive: true });
  writeFileSync(
    PCLOUD_SETTINGS_PATH,
    `${JSON.stringify(settings, null, 2)}\n`,
    'utf8',
  );
}

export function clearPcloudSettings() {
  writePcloudSettings({
    accessToken: '',
    apiHost: 'api.pcloud.com',
  });
}
