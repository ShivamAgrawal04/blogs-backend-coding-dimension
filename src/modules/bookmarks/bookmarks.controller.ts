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
import { BookmarksService } from './bookmarks.service';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
