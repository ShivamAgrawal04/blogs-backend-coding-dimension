import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { newsletterSubscribers } from '@/db/schema';
import type {
  NewsletterRepository,
  SubscribeNewsletterInput,
} from '@/database/repositories/interfaces/newsletter.repository';
import type { NewsletterSubscriberEntity } from '@/database/types';

@Injectable()
export class PostgresNewsletterRepository implements NewsletterRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByEmail(email: string): Promise<NewsletterSubscriberEntity | null> {
    const [subscriber] = await this.db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email.toLowerCase()))
      .limit(1);
    return subscriber ?? null;
  }

  async subscribe(
    input: SubscribeNewsletterInput,
  ): Promise<NewsletterSubscriberEntity> {
    const email = input.email.toLowerCase();
    const existing = await this.findByEmail(email);

    if (existing) {
      if (existing.active) {
        return existing;
      }

      const [subscriber] = await this.db
        .update(newsletterSubscribers)
        .set({
          active: true,
          name: input.name ?? existing.name,
          updatedAt: new Date(),
        })
        .where(eq(newsletterSubscribers.id, existing.id))
        .returning();
      return subscriber;
    }

    const [subscriber] = await this.db
      .insert(newsletterSubscribers)
      .values({
        id: createId(),
        email,
        name: input.name,
        token: createId(),
      })
      .returning();
    return subscriber;
  }

  async list() {
    const [subscribers, activeCount, inactiveCount] = await Promise.all([
      this.db
        .select({
          id: newsletterSubscribers.id,
          email: newsletterSubscribers.email,
          name: newsletterSubscribers.name,
          active: newsletterSubscribers.active,
          createdAt: newsletterSubscribers.createdAt,
        })
        .from(newsletterSubscribers)
        .orderBy(desc(newsletterSubscribers.createdAt)),
      this.db
        .select({ value: count() })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.active, true)),
      this.db
        .select({ value: count() })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.active, false)),
    ]);

    return {
      subscribers,
      activeCount: activeCount[0]?.value ?? 0,
      inactiveCount: inactiveCount[0]?.value ?? 0,
      total: (activeCount[0]?.value ?? 0) + (inactiveCount[0]?.value ?? 0),
    };
  }
}
