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
import { LikesService } from '@/modules/likes/likes.service';
import { ToggleLikeDto } from '@/modules/likes/dto/toggle-like.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

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
  @ApiOperation({ summary: 'Get like or dislike count for a blog, note, or comment' })
  @ApiQuery({ name: 'blogId', required: false })
  @ApiQuery({ name: 'noteId', required: false })
  @ApiQuery({ name: 'commentId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['LIKE', 'DISLIKE'] })
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
