import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@/modules/auth/auth.service';
import { AuthController } from '@/modules/auth/auth.controller';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { LocalStrategy } from '@/modules/auth/strategies/local.strategy';
import { GoogleStrategy } from '@/modules/auth/strategies/google.strategy';
import { GithubStrategy } from '@/modules/auth/strategies/github.strategy';
import { PendingAvatarMiddleware } from '@/modules/auth/middleware/pending-avatar.middleware';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    GithubStrategy,
    PendingAvatarMiddleware,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PendingAvatarMiddleware).forRoutes(
      { path: 'auth/google', method: RequestMethod.GET },
      { path: 'auth/github', method: RequestMethod.GET },
    );
  }
}
