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
import { NewsletterService } from '@/modules/newsletter/newsletter.service';
import { SubscribeDto } from '@/modules/newsletter/dto/subscribe.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private newsletterService: NewsletterService) {}

  @Post()
  @ApiOperation({ summary: 'Subscribe to the newsletter' })
  @HttpCode(HttpStatus.CREATED)
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all subscribers (admin only)' })
  findAll() {
    return this.newsletterService.findAll();
  }
}
