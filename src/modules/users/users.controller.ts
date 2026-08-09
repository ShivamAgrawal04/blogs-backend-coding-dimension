import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user dashboard data' })
  async getDashboard(@CurrentUser() user: { id: string }) {
    return this.usersService.getDashboard(user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        bio: { type: 'string' },
        image: { type: 'string' },
        avatarId: { type: 'number' },
      },
    },
  })
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: { name?: string; bio?: string; image?: string; avatarId?: number },
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
