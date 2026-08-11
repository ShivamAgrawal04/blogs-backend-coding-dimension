import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@/modules/auth/auth.service';
import { Request } from 'express';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') || 'unused',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') || 'unused',
      callbackURL: `${config.get('OAUTH_CALLBACK_URL')}/github/callback`,
      scope: ['user:email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any) => void,
  ) {
    const email =
      profile.emails?.[0]?.value ||
      `${profile.username}@users.noreply.github.com`;
    const cookieAvatar = req.cookies?.pending_avatar_id
      ? Number(req.cookies.pending_avatar_id)
      : undefined;
    const queryAvatar = req.query?.avatarId ? Number(req.query.avatarId) : undefined;

    const user = await this.authService.upsertOAuthUser({
      provider: 'github',
      providerAccountId: profile.id,
      email,
      name: profile.displayName || profile.username,
      image: profile.photos?.[0]?.value,
      avatarId: cookieAvatar || queryAvatar,
      accessToken,
      refreshToken,
    });
    done(null, user);
  }
}
