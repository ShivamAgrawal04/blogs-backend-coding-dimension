import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from '@/modules/users/users.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
        username: { type: 'string' },
        bio: { type: 'string' },
        image: { type: 'string' },
        avatarId: { type: 'number' },
        dateOfBirth: { type: 'string', format: 'date', nullable: true },
      },
    },
  })
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body()
    dto: {
      name?: string;
      username?: string;
      bio?: string;
      image?: string;
      avatarId?: number;
      dateOfBirth?: string | null;
    },
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
