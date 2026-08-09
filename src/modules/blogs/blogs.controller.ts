import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BlogService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Get published blogs with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of published blogs' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    return this.blogService.findAll({ page, limit, category, tag });
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all blogs including drafts (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all blogs' })
  findAllAdmin() {
    return this.blogService.findAllAdmin();
  }

  @Get('slugs')
  @ApiOperation({ summary: 'List published blog slugs for sitemap' })
  listSlugs() {
    return this.blogService.listPublishedSlugs();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single published blog by ID or slug' })
  @ApiResponse({ status: 200, description: 'Blog found' })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  findOne(@Param('id') idOrSlug: string) {
    return this.blogService.findOne(idOrSlug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new blog (Admin only)' })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBlogDto,
  ) {
    return this.blogService.create(user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateBlogDto) {
    return this.blogService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a blog (Admin only)' })
  delete(@Param('id') id: string) {
    return this.blogService.delete(id);
  }
}
