import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

/** Persist avatarId query into a cookie before Passport redirects away to the provider. */
@Injectable()
export class PendingAvatarMiddleware implements NestMiddleware {
  constructor(private config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const avatarId = req.query?.avatarId;
    if (avatarId && !Number.isNaN(Number(avatarId))) {
      res.cookie('pending_avatar_id', String(avatarId), {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.config.get<boolean>('COOKIE_SECURE') === true,
        maxAge: 10 * 60 * 1000,
        path: '/',
      });
    }
    next();
  }
}
