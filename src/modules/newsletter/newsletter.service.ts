import {
  Inject,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { newsletterSubscribers } from '@/db/schema';

@Injectable()
export class NewsletterService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async subscribe(dto: { email: string; name?: string }) {
    const email = dto.email.toLowerCase();
    const [existing] = await this.db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);

    if (existing) {
      if (existing.active) {
        throw new ConflictException('Email is already subscribed');
      }

      const [subscriber] = await this.db
        .update(newsletterSubscribers)
        .set({ active: true, name: dto.name || existing.name, updatedAt: new Date() })
        .where(eq(newsletterSubscribers.id, existing.id))
        .returning();
      return subscriber;
    }

    const [subscriber] = await this.db
      .insert(newsletterSubscribers)
      .values({ id: createId(), email, name: dto.name, token: createId() })
      .returning();
    return subscriber;
  }

  async findAll() {
    const [subscribers, activeCount, inactiveCount] = await Promise.all([
      this.db.select({
        id: newsletterSubscribers.id,
        email: newsletterSubscribers.email,
        name: newsletterSubscribers.name,
        active: newsletterSubscribers.active,
        createdAt: newsletterSubscribers.createdAt,
      }).from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)),
      this.db.select({ value: count() }).from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.active, true)),
      this.db.select({ value: count() }).from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.active, false)),
    ]);

    return {
      subscribers,
      activeCount: activeCount[0].value,
      inactiveCount: inactiveCount[0].value,
      total: activeCount[0].value + inactiveCount[0].value,
    };
  }
}
