import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookmarksService } from '@/modules/bookmarks/bookmarks.service';
import { ToggleBookmarkDto } from '@/modules/bookmarks/dto/toggle-bookmark.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Bookmarks')
@Controller('bookmarks')
export class BookmarksController {
  constructor(private bookmarksService: BookmarksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle bookmark on a blog or note' })
  @HttpCode(HttpStatus.OK)
  toggle(@CurrentUser() user: any, @Body() dto: ToggleBookmarkDto) {
    return this.bookmarksService.toggle(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user bookmarks' })
  getUserBookmarks(@CurrentUser() user: any) {
    return this.bookmarksService.getUserBookmarks(user.id);
  }
}
