import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private prisma: PrismaService) {}

  async toggle(userId: string, dto: { blogId?: string; noteId?: string }) {
    const where: Record<string, unknown> = { userId };

    if (dto.blogId) where.blogId = dto.blogId;
    else if (dto.noteId) where.noteId = dto.noteId;

    const existing = await this.prisma.bookmark.findFirst({ where });

    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }

    await this.prisma.bookmark.create({
      data: {
        userId,
        blogId: dto.blogId,
        noteId: dto.noteId,
      },
    });

    return { bookmarked: true };
  }

  async getUserBookmarks(userId: string) {
    return this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        blog: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            category: true,
            readTime: true,
            imageGradient: true,
            author: {
              select: { id: true, name: true, image: true },
            },
            _count: {
              select: { likes: true, comments: true },
            },
          },
        },
        note: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            readTime: true,
            subject: {
              select: { id: true, name: true, slug: true, icon: true },
            },
            _count: {
              select: { likes: true, comments: true },
            },
          },
        },
      },
    });
  }

  async isBookmarked(
    userId: string,
    blogId?: string,
    noteId?: string,
  ): Promise<boolean> {
    const where: Record<string, unknown> = { userId };

    if (blogId) where.blogId = blogId;
    else if (noteId) where.noteId = noteId;

    const bookmark = await this.prisma.bookmark.findFirst({ where });
    return !!bookmark;
  }
}
