import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { eq } from 'drizzle-orm';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { users } from '@/db/schema';

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
    @Inject(DRIZZLE) private db: DrizzleDB,
  ) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const [user] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        bio: users.bio,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
