import { createHash, randomBytes } from 'crypto';
import {
  Inject,
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcryptjs';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import {
  oauthAccounts,
  refreshTokens,
  users,
} from '@/db/schema';
import { resolveAvatar } from '@/common/avatars';
import { RegisterDto } from '@/modules/auth/dto/register.dto';

const userColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  email: users.email,
  role: users.role,
  bio: users.bio,
  image: users.image,
  dateOfBirth: users.dateOfBirth,
  createdAt: users.createdAt,
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private cookieSecure() {
    return this.config.get<boolean>('COOKIE_SECURE') === true;
  }

  private accessCookieOptions() {
    return {
      httpOnly: true,
      secure: this.cookieSecure(),
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 15 * 60 * 1000,
    };
  }

  private refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.cookieSecure(),
      sameSite: 'lax' as const,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async issueTokens(
    user: { id: string; email: string; role: string },
    res: Response,
  ) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.insert(refreshTokens).values({
      id: createId(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    res.cookie('access_token', accessToken, this.accessCookieOptions());
    res.cookie('refresh_token', refreshToken, this.refreshCookieOptions());

    return { accessToken, refreshToken };
  }

  clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth' });
  }

  /** Email/password register — kept for admin tooling; public users use OAuth */
  async register(dto: RegisterDto, res: Response) {
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    if (!dto.avatarId && !dto.image) {
      throw new ConflictException('Avatar selection is required');
    }
    const image = resolveAvatar(dto.avatarId, dto.image);

    const [user] = await this.db
      .insert(users)
      .values({
        id: createId(),
        name: dto.name.trim(),
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        image,
      })
      .returning(userColumns);

    await this.issueTokens(user, res);
    return { user };
  }

  async validateUser(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (!user?.password) return null;
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return null;
    const { password: _, ...result } = user;
    return result;
  }

  async login(
    user: {
      id: string;
      email: string;
      role: string;
      name?: string | null;
      image?: string | null;
      bio?: string | null;
    },
    res: Response,
  ) {
    await this.issueTokens(user, res);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name ?? null,
        image: user.image ?? null,
        bio: user.bio ?? null,
      },
    };
  }

  async refresh(refreshToken: string | undefined, res: Response) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const tokenHash = this.hashToken(refreshToken);
    const [stored] = await this.db
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
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));

    const [user] = await this.db
      .select(userColumns)
      .from(users)
      .where(eq(users.id, stored.userId))
      .limit(1);
    if (!user) throw new UnauthorizedException();

    await this.issueTokens(user, res);
    return { user };
  }

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }
    this.clearAuthCookies(res);
    return { message: 'Logged out' };
  }

  async upsertOAuthUser(input: {
    provider: 'google' | 'github';
    providerAccountId: string;
    email: string;
    name?: string | null;
    image?: string | null;
    avatarId?: number;
    accessToken?: string;
    refreshToken?: string;
  }) {
    const email = input.email.toLowerCase();
    const [linked] = await this.db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, input.provider),
          eq(oauthAccounts.providerAccountId, input.providerAccountId),
        ),
      )
      .limit(1);

    if (linked) {
      const [user] = await this.db
        .select(userColumns)
        .from(users)
        .where(eq(users.id, linked.userId))
        .limit(1);
      return user;
    }

    let [user] = await this.db
      .select(userColumns)
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      const image =
        input.avatarId != null
          ? resolveAvatar(input.avatarId, null)
          : input.image || resolveAvatar(undefined, null);
      [user] = await this.db
        .insert(users)
        .values({
          id: createId(),
          email,
          name: input.name || email.split('@')[0],
          image,
          emailVerified: new Date(),
          password: null,
        })
        .returning(userColumns);
    }

    await this.db.insert(oauthAccounts).values({
      id: createId(),
      userId: user.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
    });

    return user;
  }

  async getProfile(userId: string) {
    const [user] = await this.db
      .select(userColumns)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    return user;
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
    // Delegate to same validation rules as UsersService via shared update here
    const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundException('User not found');

    let username: string | null | undefined = undefined;
    if (dto.username !== undefined) {
      if (dto.username === null || !String(dto.username).trim()) {
        username = null;
      } else {
        const trimmed = String(dto.username).trim().toLowerCase();
        if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) {
          throw new ConflictException(
            'Username must be 3–30 characters (letters, numbers, underscore)',
          );
        }
        const [taken] = await this.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, trimmed))
          .limit(1);
        if (taken && taken.id !== userId) {
          throw new ConflictException('Username is already taken');
        }
        username = trimmed;
      }
    }

    let image: string | undefined;
    if (dto.image !== undefined || dto.avatarId !== undefined) {
      image = resolveAvatar(dto.avatarId, dto.image);
    }

    let dateOfBirth: Date | null | undefined = undefined;
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

    const [updated] = await this.db
      .update(users)
      .set({
        ...(dto.name !== undefined && { name: dto.name.trim() || null }),
        ...(username !== undefined && { username }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(image !== undefined && { image }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning(userColumns);
    return updated;
  }
}
