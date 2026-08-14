import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { StorageService } from '@/storage/storage.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get(':fileid')
  @ApiOperation({ summary: 'Redirect to a pCloud file download URL' })
  async serve(@Param('fileid') fileid: string, @Res() res: Response) {
    const url = await this.storage.getDownloadUrl(fileid);
    return res.redirect(302, url);
  }
}
