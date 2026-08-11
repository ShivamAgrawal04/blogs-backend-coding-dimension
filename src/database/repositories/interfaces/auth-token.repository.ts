import type {
  OAuthAccountEntity,
  RefreshTokenEntity,
} from '@/database/types';

export interface CreateRefreshTokenInput {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateOAuthAccountInput {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
}

export interface AuthTokenRepository {
  createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity>;
  findValidRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  revokeRefreshTokenById(id: string): Promise<void>;
  revokeRefreshTokenByHash(tokenHash: string): Promise<void>;
  findOAuthAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<OAuthAccountEntity | null>;
  createOAuthAccount(input: CreateOAuthAccountInput): Promise<OAuthAccountEntity>;
}
