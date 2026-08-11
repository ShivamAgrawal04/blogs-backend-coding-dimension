import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AdminService } from '@/modules/admin/admin.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users with pagination and search' })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers({ page, limit, search });
  }

  @Put('users/role')
  @ApiOperation({ summary: 'Change user role (USER or ADMIN only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        role: { type: 'string', enum: ['USER', 'ADMIN'] },
      },
      required: ['userId', 'role'],
    },
  })
  async changeRole(
    @CurrentUser() actor: { id: string; email?: string | null },
    @Body() body: { userId: string; role: 'USER' | 'ADMIN' },
  ) {
    return this.adminService.changeRole(actor, body.userId, body.role);
  }

  @Get('blogs')
  @ApiOperation({ summary: 'List all blogs for admin' })
  async getAllBlogs() {
    return this.adminService.getAllBlogs();
  }

  @Delete('blogs')
  @ApiOperation({ summary: 'Delete a blog' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        blogId: { type: 'string' },
      },
      required: ['blogId'],
    },
  })
  async deleteBlog(@Body() body: { blogId: string }) {
    return this.adminService.deleteBlog(body.blogId);
  }

  @Get('notes')
  @ApiOperation({ summary: 'List all notes for admin' })
  async getAllNotes() {
    return this.adminService.getAllNotes();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Admin analytics summary' })
  async getAnalytics() {
    return this.adminService.getStats();
  }

  @Get('settings/database')
  @ApiOperation({ summary: 'Get active and preferred database provider' })
  getDatabaseSettings() {
    return this.adminService.getDatabaseSettings();
  }

  @Put('settings/database')
  @ApiOperation({ summary: 'Switch preferred database (postgres | mongodb). Restart required.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['postgres', 'mongodb'] },
      },
      required: ['provider'],
    },
  })
  updateDatabaseProvider(@Body() body: { provider: 'postgres' | 'mongodb' }) {
    return this.adminService.updateDatabaseProvider(body.provider);
  }
}
