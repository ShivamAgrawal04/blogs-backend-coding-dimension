import { Inject, Injectable } from '@nestjs/common';
import { SEARCH_REPOSITORY } from '@/database/database.tokens';
import type { SearchRepository } from '@/database/repositories/interfaces/search.repository';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_REPOSITORY)
    private readonly searchRepository: SearchRepository,
  ) {}

  async search(query: string) {
    return this.searchRepository.search(query);
  }
}
