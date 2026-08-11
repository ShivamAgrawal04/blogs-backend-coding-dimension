import {
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { NEWSLETTER_REPOSITORY } from '@/database/database.tokens';
import type { NewsletterRepository } from '@/database/repositories/interfaces/newsletter.repository';

@Injectable()
export class NewsletterService {
  constructor(
    @Inject(NEWSLETTER_REPOSITORY)
    private readonly newsletterRepository: NewsletterRepository,
  ) {}

  async subscribe(dto: { email: string; name?: string }) {
    const email = dto.email.toLowerCase();
    const existing = await this.newsletterRepository.findByEmail(email);

    if (existing) {
      if (existing.active) {
        throw new ConflictException('Email is already subscribed');
      }
    }

    return this.newsletterRepository.subscribe({ ...dto, email });
  }

  async findAll() {
    return this.newsletterRepository.list();
  }
}
