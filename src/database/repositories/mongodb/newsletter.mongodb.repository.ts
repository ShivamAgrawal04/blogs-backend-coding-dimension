import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createId } from '@paralleldrive/cuid2';
import { Model } from 'mongoose';
import { NEWSLETTER_SUBSCRIBER_MODEL } from '@/database/mongodb/schemas';
import { stripMongoMeta, stripMongoMetaArray } from '@/database/mongodb/mongo.helpers';
import type { NewsletterSubscriberDocument } from '@/database/mongodb/schemas/newsletter-subscribers.schema';
import type {
  NewsletterRepository,
  SubscribeNewsletterInput,
} from '@/database/repositories/interfaces/newsletter.repository';
import type { NewsletterSubscriberEntity } from '@/database/types';

@Injectable()
export class MongoNewsletterRepository implements NewsletterRepository {
  constructor(
    @InjectModel(NEWSLETTER_SUBSCRIBER_MODEL)
    private readonly newsletterModel: Model<NewsletterSubscriberDocument>,
  ) {}

  async findByEmail(email: string): Promise<NewsletterSubscriberEntity | null> {
    return stripMongoMeta(
      await this.newsletterModel
        .findOne({ email: email.toLowerCase() })
        .lean<NewsletterSubscriberEntity>()
        .exec(),
    );
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

      const updated = await this.newsletterModel
        .findOneAndUpdate(
          { id: existing.id },
          {
            active: true,
            name: input.name ?? existing.name,
            updatedAt: new Date(),
          },
          { new: true },
        )
        .lean<NewsletterSubscriberEntity>()
        .exec();
      return stripMongoMeta(updated) as NewsletterSubscriberEntity;
    }

    const document = await this.newsletterModel.create({
      id: createId(),
      email,
      name: input.name ?? null,
      active: true,
      token: createId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return stripMongoMeta(document.toObject()) as NewsletterSubscriberEntity;
  }

  async list() {
    const [subscribers, activeCount, inactiveCount] = await Promise.all([
      this.newsletterModel
        .find({}, { _id: 0, id: 1, email: 1, name: 1, active: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.newsletterModel.countDocuments({ active: true }).exec(),
      this.newsletterModel.countDocuments({ active: false }).exec(),
    ]);

    return {
      subscribers: stripMongoMetaArray(subscribers),
      activeCount,
      inactiveCount,
      total: activeCount + inactiveCount,
    };
  }
}
