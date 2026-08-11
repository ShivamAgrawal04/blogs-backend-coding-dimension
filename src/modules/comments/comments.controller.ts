import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommentsService } from '@/modules/comments/comments.service';
import { CreateCommentDto } from '@/modules/comments/dto/create-comment.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get comments for a blog or note' })
  @ApiQuery({ name: 'blogId', required: false })
  @ApiQuery({ name: 'noteId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findMany(
    @Query('blogId') blogId?: string,
    @Query('noteId') noteId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.findMany({ blogId, noteId, page, limit });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment' })
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: any, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('text') text: string,
  ) {
    return this.commentsService.update(id, user.id, text);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.commentsService.delete(id, user.id, user.role);
  }
}
