import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@/modules/auth/auth.service';
import { Request } from 'express';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'unused',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'unused',
      callbackURL: `${config.get('OAUTH_CALLBACK_URL')}/google/callback`,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Google account has no email'), undefined);
    const cookieAvatar = req.cookies?.pending_avatar_id
      ? Number(req.cookies.pending_avatar_id)
      : undefined;
    const queryAvatar = req.query?.avatarId ? Number(req.query.avatarId) : undefined;

    const user = await this.authService.upsertOAuthUser({
      provider: 'google',
      providerAccountId: profile.id,
      email,
      name: profile.displayName,
      image: profile.photos?.[0]?.value,
      avatarId: cookieAvatar || queryAvatar,
      accessToken,
      refreshToken,
    });
    done(null, user);
  }
}
