import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createId } from '@paralleldrive/cuid2';
import { AuthService } from '@/modules/auth/auth.service';
import { RegisterDto } from '@/modules/auth/dto/register.dto';
import { LocalAuthGuard } from '@/modules/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Register with email (admin/dev). Public users should use OAuth.' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(dto, res);
  }

  @Post('login')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin/email login — sets httpOnly access + refresh cookies' })
  @ApiCookieAuth('access_token')
  async login(
    @CurrentUser()
    user: {
      id: string;
      email: string;
      role: string;
      name?: string | null;
      image?: string | null;
      bio?: string | null;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(user, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req.cookies?.refresh_token, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token and clear cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req.cookies?.refresh_token, res);
  }

  @Get('google')
  @ApiOperation({ summary: 'Start Google OAuth (pass ?avatarId=1-20)' })
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontend = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const user = req.user as any;
    if (!user) return res.redirect(`${frontend}/login?error=oauth`);
    await this.authService.issueTokens(user, res);
    res.clearCookie('pending_avatar_id', { path: '/' });
    return res.redirect(`${frontend}/auth/callback`);
  }

  @Get('github')
  @ApiOperation({ summary: 'Start GitHub OAuth (pass ?avatarId=1-20)' })
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    return;
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const frontend = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const user = req.user as any;
    if (!user) return res.redirect(`${frontend}/login?error=oauth`);
    await this.authService.issueTokens(user, res);
    res.clearCookie('pending_avatar_id', { path: '/' });
    return res.redirect(`${frontend}/auth/callback`);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Update profile / avatar preset' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body()
    dto: {
      name?: string;
      username?: string;
      bio?: string;
      image?: string;
      avatarId?: number;
      dateOfBirth?: string | null;
    },
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { avatar: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'avatars'),
        filename: (_req, file, cb) => {
          cb(null, `${createId()}${extname(file.originalname) || '.jpg'}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only images allowed') as any, false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload cropped avatar image' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File required');
    const image = `/uploads/avatars/${file.filename}`;
    return this.authService.updateProfile(userId, { image });
  }
}
