import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { ToggleLikeDto } from './dto/toggle-like.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Likes')
@Controller('likes')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle like on a blog, note, or comment' })
  @HttpCode(HttpStatus.OK)
  toggle(@CurrentUser() user: any, @Body() dto: ToggleLikeDto) {
    return this.likesService.toggle(user.id, dto);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get like count for a blog, note, or comment' })
  @ApiQuery({ name: 'blogId', required: false })
  @ApiQuery({ name: 'noteId', required: false })
  @ApiQuery({ name: 'commentId', required: false })
  async getCount(
    @Query('blogId') blogId?: string,
    @Query('noteId') noteId?: string,
    @Query('commentId') commentId?: string,
    @Query('type') type?: 'LIKE' | 'DISLIKE',
  ) {
    const count = await this.likesService.getLikeCount({
      blogId,
      noteId,
      commentId,
      type,
    });
    return { count };
  }
}
