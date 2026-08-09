import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string) {
    const term = query.trim();

    const [blogs, notes] = await Promise.all([
      this.prisma.blog.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { content: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          category: true,
          readTime: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, image: true },
          },
          tags: {
            select: {
              tag: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      this.prisma.note.findMany({
        where: {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { content: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          readTime: true,
          createdAt: true,
          subject: {
            select: { id: true, name: true, slug: true, icon: true },
          },
        },
      }),
    ]);

    return { blogs, notes };
  }
}
