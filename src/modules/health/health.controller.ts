import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Full health check' })
  async check() {
    return this.healthService.check();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  async live() {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    return this.healthService.ready();
  }
}
