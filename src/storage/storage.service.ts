import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import {
  clearPcloudSettings,
  readPcloudSettings,
  writePcloudSettings,
} from '@/storage/pcloud-settings';

export type UploadFolder = 'avatars' | 'files' | 'blogs' | 'notes';

type PcloudJson = Record<string, unknown> & { result?: number; error?: string };

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private folderCache = new Map<string, number>();

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.getAccessToken() && this.getClientId() && this.getClientSecret());
  }

  isConnected() {
    return Boolean(this.getAccessToken());
  }

  status() {
    const saved = readPcloudSettings();
    return {
      provider: 'pcloud' as const,
      clientConfigured: Boolean(this.getClientId() && this.getClientSecret()),
      connected: this.isConnected(),
      apiHost: this.getApiHost(),
      uid: saved?.uid ?? null,
      connectedAt: saved?.connectedAt ?? null,
    };
  }

  getAuthorizeUrl(state: string) {
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri();
    if (!clientId || !this.getClientSecret()) {
      throw new ServiceUnavailableException(
        'pCloud is not configured. Set PCLOUD_CLIENT_ID and PCLOUD_CLIENT_SECRET.',
      );
    }
    const url = new URL('https://my.pcloud.com/oauth2/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    return url.toString();
  }

  createOauthState() {
    return randomBytes(24).toString('hex');
  }

  async exchangeCode(code: string, hostname?: string) {
    const host = this.normalizeHost(hostname) || 'api.pcloud.com';
    const body = await this.requestJson<PcloudJson>(
      host,
      '/oauth2_token',
      {
        method: 'GET',
        query: {
          client_id: this.getClientId(),
          client_secret: this.getClientSecret(),
          code,
        },
      },
      false,
    );
    const accessToken = String(body.access_token || '');
    if (!accessToken) {
      throw new InternalServerErrorException('pCloud did not return an access token');
    }
    writePcloudSettings({
      accessToken,
      apiHost: host,
      uid: typeof body.uid === 'number' ? body.uid : undefined,
      connectedAt: new Date().toISOString(),
    });
    this.folderCache.clear();
    return this.status();
  }

  disconnect() {
    clearPcloudSettings();
    this.folderCache.clear();
  }

  async upload(
    file: Express.Multer.File,
    folder: UploadFolder,
  ): Promise<{ key: string; url: string; contentType: string; size: number }> {
    const token = this.requireToken();
    if (!file?.buffer?.length) {
      throw new InternalServerErrorException('Empty upload');
    }

    const folderId = await this.ensureFolder(folder);
    const ext = this.safeExt(file.originalname, file.mimetype);
    const filename = `${createId()}${ext}`;
    const form = new FormData();
    form.append('folderid', String(folderId));
    form.append('filename', filename);
    form.append('renameifexists', '1');
    form.append('nopartial', '1');
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype || 'application/octet-stream',
      }),
      filename,
    );

    const uploaded = await this.requestJson<PcloudJson>(
      this.getApiHost(),
      '/uploadfile',
      {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${token}` },
      },
      true,
    );

    const meta = this.firstFileMeta(uploaded);
    const fileid = Number(meta?.fileid);
    if (!fileid) {
      this.logger.error('pCloud upload response missing fileid');
      throw new InternalServerErrorException('Failed to upload file');
    }

    return {
      key: String(fileid),
      url: `/api/media/${fileid}`,
      contentType: file.mimetype,
      size: file.size,
    };
  }

  async getDownloadUrl(fileid: string) {
    const token = this.requireToken();
    const data = await this.requestJson<PcloudJson>(
      this.getApiHost(),
      '/getfilelink',
      {
        method: 'GET',
        query: { fileid, forcedownload: '0' },
        headers: { Authorization: `Bearer ${token}` },
      },
      true,
    );
    const hosts = data.hosts as string[] | undefined;
    const path = String(data.path || '');
    if (!hosts?.[0] || !path) {
      throw new InternalServerErrorException('pCloud download link unavailable');
    }
    return `https://${hosts[0]}${path}`;
  }

  async deleteByUrl(url?: string | null) {
    if (!url) return;
    const match = url.match(/\/api\/media\/(\d+)/);
    if (!match) return;
    await this.delete(match[1]);
  }

  async delete(fileid: string) {
    const token = this.getAccessToken();
    if (!token) return;
    try {
      await this.requestJson(
        this.getApiHost(),
        '/deletefile',
        {
          method: 'GET',
          query: { fileid },
          headers: { Authorization: `Bearer ${token}` },
        },
        true,
      );
    } catch (err) {
      this.logger.warn(`pCloud delete skipped for ${fileid}`, err as Error);
    }
  }

  private async ensureFolder(name: string) {
    const cached = this.folderCache.get(name);
    if (cached) return cached;
    const root = await this.createFolderIfMissing('coding-dimension', 0);
    const id = await this.createFolderIfMissing(name, root);
    this.folderCache.set(name, id);
    return id;
  }

  private async createFolderIfMissing(name: string, parentFolderId: number) {
    const token = this.requireToken();
    const data = await this.requestJson<PcloudJson>(
      this.getApiHost(),
      '/createfolderifnotexists',
      {
        method: 'GET',
        query: { folderid: String(parentFolderId), name },
        headers: { Authorization: `Bearer ${token}` },
      },
      true,
    );
    const metadata = data.metadata as { folderid?: number } | undefined;
    const folderid = Number(metadata?.folderid);
    if (!folderid) {
      throw new InternalServerErrorException(`Could not create pCloud folder ${name}`);
    }
    return folderid;
  }

  private firstFileMeta(payload: PcloudJson) {
    const list = payload.metadata;
    if (Array.isArray(list)) return list[0] as { fileid?: number };
    if (list && typeof list === 'object') return list as { fileid?: number };
    return null;
  }

  private requireToken() {
    const token = this.getAccessToken();
    if (!token) {
      throw new ServiceUnavailableException(
        'pCloud is not connected. Open Admin → Settings and connect pCloud.',
      );
    }
    return token;
  }

  private getAccessToken() {
    return (
      readPcloudSettings()?.accessToken?.trim() ||
      this.config.get<string>('PCLOUD_ACCESS_TOKEN', '').trim()
    );
  }

  private getApiHost() {
    return (
      this.normalizeHost(readPcloudSettings()?.apiHost) ||
      this.normalizeHost(this.config.get<string>('PCLOUD_API_HOST', '')) ||
      'api.pcloud.com'
    );
  }

  private getClientId() {
    return this.config.get<string>('PCLOUD_CLIENT_ID', '').trim();
  }

  private getClientSecret() {
    return this.config.get<string>('PCLOUD_CLIENT_SECRET', '').trim();
  }

  getRedirectUri() {
    return (
      this.config.get<string>('PCLOUD_REDIRECT_URI', '').trim() ||
      'http://localhost:3001/api/uploads/pcloud/callback'
    );
  }

  private normalizeHost(host?: string | null) {
    if (!host) return '';
    return host.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  private async requestJson<T extends PcloudJson>(
    host: string,
    path: string,
    init: {
      method: 'GET' | 'POST';
      query?: Record<string, string>;
      headers?: Record<string, string>;
      body?: FormData;
    },
    requireAuthResult: boolean,
  ): Promise<T> {
    const url = new URL(`https://${host}${path}`);
    for (const [key, value] of Object.entries(init.query || {})) {
      url.searchParams.set(key, value);
    }
    let response: Response;
    try {
      response = await fetch(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
      });
    } catch (err) {
      this.logger.error(`pCloud ${path} network error`, err as Error);
      throw new InternalServerErrorException('pCloud request failed');
    }
    const data = (await response.json()) as T;
    if (!response.ok || (requireAuthResult && data.result !== 0)) {
      const message = data.error || `pCloud ${path} failed`;
      this.logger.error(`${message} (${data.result ?? response.status})`);
      throw new InternalServerErrorException(message);
    }
    if (data.result && data.result !== 0) {
      throw new InternalServerErrorException(data.error || 'pCloud request failed');
    }
    return data;
  }

  private safeExt(originalName: string, mime: string) {
    const fromName = extname(originalName || '').toLowerCase();
    if (fromName && /^\.[a-z0-9]{1,8}$/.test(fromName)) return fromName;
    const fromMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/avif': '.avif',
      'application/pdf': '.pdf',
      'application/zip': '.zip',
      'text/plain': '.txt',
      'text/markdown': '.md',
    };
    return fromMime[mime] || '';
  }
}
