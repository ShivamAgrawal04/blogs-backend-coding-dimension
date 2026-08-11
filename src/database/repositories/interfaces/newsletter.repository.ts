import type { NewsletterSubscriberEntity } from '@/database/types';

export interface SubscribeNewsletterInput {
  email: string;
  name?: string;
}

export interface NewsletterRepository {
  findByEmail(email: string): Promise<NewsletterSubscriberEntity | null>;
  subscribe(input: SubscribeNewsletterInput): Promise<NewsletterSubscriberEntity>;
  list(): Promise<{
    subscribers: Array<{
      id: string;
      email: string;
      name: string | null;
      active: boolean;
      createdAt: Date;
    }>;
    activeCount: number;
    inactiveCount: number;
    total: number;
  }>;
}
