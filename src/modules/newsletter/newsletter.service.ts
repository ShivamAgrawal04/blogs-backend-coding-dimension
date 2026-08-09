import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NewsletterService {
  constructor(private prisma: PrismaService) {}

  async subscribe(dto: { email: string; name?: string }) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      if (existing.active) {
        throw new ConflictException('Email is already subscribed');
      }

      return this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { active: true, name: dto.name || existing.name },
      });
    }

    return this.prisma.newsletterSubscriber.create({
      data: {
        email: dto.email,
        name: dto.name,
      },
    });
  }

  async findAll() {
    const [subscribers, activeCount, inactiveCount] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          createdAt: true,
        },
      }),
      this.prisma.newsletterSubscriber.count({ where: { active: true } }),
      this.prisma.newsletterSubscriber.count({ where: { active: false } }),
    ]);

    return {
      subscribers,
      activeCount,
      inactiveCount,
      total: activeCount + inactiveCount,
    };
  }
}
