import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { oauthAccounts, refreshTokens } from '@/db/schema';
import type {
  AuthTokenRepository,
  CreateOAuthAccountInput,
  CreateRefreshTokenInput,
} from '@/database/repositories/interfaces/auth-token.repository';
import type {
  OAuthAccountEntity,
  RefreshTokenEntity,
} from '@/database/types';

@Injectable()
export class PostgresAuthTokenRepository implements AuthTokenRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async createRefreshToken(
    input: CreateRefreshTokenInput,
  ): Promise<RefreshTokenEntity> {
    const [token] = await this.db
      .insert(refreshTokens)
      .values(input)
      .returning();
    return token;
  }

  async findValidRefreshTokenByHash(
    tokenHash: string,
  ): Promise<RefreshTokenEntity | null> {
    const [token] = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return token ?? null;
  }

  async revokeRefreshTokenById(id: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id));
  }

  async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  async findOAuthAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<OAuthAccountEntity | null> {
    const [account] = await this.db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId),
        ),
      )
      .limit(1);
    return account ?? null;
  }

  async createOAuthAccount(
    input: CreateOAuthAccountInput,
  ): Promise<OAuthAccountEntity> {
    const [account] = await this.db
      .insert(oauthAccounts)
      .values({
        id: input.id,
        userId: input.userId,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        accessToken: input.accessToken ?? null,
        refreshToken: input.refreshToken ?? null,
        expiresAt: input.expiresAt ?? null,
      })
      .returning();
    return account;
  }
}
