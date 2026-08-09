import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search blogs and notes' })
  @ApiQuery({ name: 'q', required: true, description: 'Search term' })
  search(@Query('q') query: string) {
    return this.searchService.search(query);
  }
}
