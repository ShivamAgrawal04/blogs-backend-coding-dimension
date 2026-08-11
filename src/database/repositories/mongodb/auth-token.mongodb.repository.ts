import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OAUTH_ACCOUNT_MODEL,
  REFRESH_TOKEN_MODEL,
} from '@/database/mongodb/schemas';
import { stripMongoMeta } from '@/database/mongodb/mongo.helpers';
import type { OAuthAccountDocument } from '@/database/mongodb/schemas/oauth-accounts.schema';
import type { RefreshTokenDocument } from '@/database/mongodb/schemas/refresh-tokens.schema';
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
export class MongoAuthTokenRepository implements AuthTokenRepository {
  constructor(
    @InjectModel(REFRESH_TOKEN_MODEL)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(OAUTH_ACCOUNT_MODEL)
    private readonly oauthAccountModel: Model<OAuthAccountDocument>,
  ) {}

  async createRefreshToken(
    input: CreateRefreshTokenInput,
  ): Promise<RefreshTokenEntity> {
    const document = await this.refreshTokenModel.create({
      ...input,
      createdAt: new Date(),
      revokedAt: null,
    });
    return stripMongoMeta(document.toObject()) as RefreshTokenEntity;
  }

  async findValidRefreshTokenByHash(
    tokenHash: string,
  ): Promise<RefreshTokenEntity | null> {
    return stripMongoMeta(
      await this.refreshTokenModel
        .findOne({
          tokenHash,
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        })
        .lean<RefreshTokenEntity>()
        .exec(),
    );
  }

  async revokeRefreshTokenById(id: string): Promise<void> {
    await this.refreshTokenModel.updateOne({ id }, { revokedAt: new Date() }).exec();
  }

  async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await this.refreshTokenModel
      .updateMany({ tokenHash }, { revokedAt: new Date() })
      .exec();
  }

  async findOAuthAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<OAuthAccountEntity | null> {
    return stripMongoMeta(
      await this.oauthAccountModel
        .findOne({ provider, providerAccountId })
        .lean<OAuthAccountEntity>()
        .exec(),
    );
  }

  async createOAuthAccount(
    input: CreateOAuthAccountInput,
  ): Promise<OAuthAccountEntity> {
    const document = await this.oauthAccountModel.create({
      id: input.id,
      userId: input.userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      accessToken: input.accessToken ?? null,
      refreshToken: input.refreshToken ?? null,
      expiresAt: input.expiresAt ?? null,
      createdAt: new Date(),
    });
    return stripMongoMeta(document.toObject()) as OAuthAccountEntity;
  }
}
