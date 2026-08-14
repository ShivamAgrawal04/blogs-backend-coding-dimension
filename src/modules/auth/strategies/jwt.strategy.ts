import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { USER_REPOSITORY } from '@/database/database.tokens';
import type { UserRepository } from '@/database/repositories/interfaces/user.repository';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

function cookieOrBearerExtractor(req: Request): string | null {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    let user = await this.userRepository.getPublicProfile(payload.sub);

    // After a DB switch, JWT `sub` may be an id from the other database.
    // Fall back to email so a still-valid cookie can resolve on the active DB.
    if (!user && payload.email) {
      const byEmail = await this.userRepository.findByEmail(payload.email);
      if (byEmail) {
        user = await this.userRepository.getPublicProfile(byEmail.id);
      }
    }

    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
