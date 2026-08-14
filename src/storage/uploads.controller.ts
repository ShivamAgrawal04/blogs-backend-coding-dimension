import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { StorageService, type UploadFolder } from '@/storage/storage.service';
import { fileMulterOptions } from '@/storage/multer.options';
import { ConfigService } from '@nestjs/config';

const FOLDERS = new Set<UploadFolder>(['files', 'blogs', 'notes']);
const STATE_COOKIE = 'pcloud_oauth_state';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  @Get('pcloud/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'pCloud connection status' })
  status() {
    return this.storage.status();
  }

  @Get('pcloud/connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Start pCloud OAuth code flow' })
  connect(@Res() res: Response) {
    const state = this.storage.createOauthState();
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      path: '/',
      maxAge: 10 * 60 * 1000,
    });
    return res.redirect(this.storage.getAuthorizeUrl(state));
  }

  @Get('pcloud/callback')
  @ApiOperation({ summary: 'pCloud OAuth redirect — exchanges code for access_token' })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('hostname') hostname: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontend = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const expected = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: '/' });
    if (!code) {
      return res.redirect(`${frontend}/admin/settings?pcloud=error&reason=missing_code`);
    }
    if (!expected || !state || expected !== state) {
      return res.redirect(`${frontend}/admin/settings?pcloud=error&reason=invalid_state`);
    }
    try {
      await this.storage.exchangeCode(code, hostname);
      return res.redirect(`${frontend}/admin/settings?pcloud=connected`);
    } catch {
      return res.redirect(`${frontend}/admin/settings?pcloud=error&reason=token`);
    }
  }

  @Post('pcloud/disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Forget saved pCloud access token' })
  disconnect() {
    this.storage.disconnect();
    return this.storage.status();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiQuery({ name: 'folder', required: false, enum: ['files', 'blogs', 'notes'] })
  @ApiOperation({ summary: 'Upload an image or file to pCloud (admin)' })
  @UseInterceptors(FileInterceptor('file', fileMulterOptions))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) throw new BadRequestException('File required');
    const dest: UploadFolder = FOLDERS.has(folder as UploadFolder)
      ? (folder as UploadFolder)
      : 'files';
    return this.storage.upload(file, dest);
  }
}
