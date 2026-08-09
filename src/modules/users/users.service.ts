import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveAvatar } from '../../common/avatars';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      recentBookmarks,
      recentReads,
      totalBlogs,
      totalComments,
      totalBookmarks,
      totalReads,
    ] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { userId },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          blog: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              createdAt: true,
              author: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
      }),
      this.prisma.readHistory.findMany({
        where: { userId },
        take: 20,
        orderBy: { readAt: 'desc' },
        select: {
          id: true,
          readAt: true,
          blog: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              createdAt: true,
              author: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
      }),
      this.prisma.blog.count({ where: { authorId: userId } }),
      this.prisma.comment.count({ where: { userId } }),
      this.prisma.bookmark.count({ where: { userId } }),
      this.prisma.readHistory.count({ where: { userId } }),
    ]);

    return {
      recentBookmarks,
      recentReads,
      totalBlogs,
      totalComments,
      totalBookmarks,
      totalReads,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        image: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            blogs: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      totalBlogs: user._count.blogs,
      totalComments: user._count.comments,
      _count: undefined,
    };
  }

  async updateProfile(
    userId: string,
    dto: { name?: string; bio?: string; image?: string; avatarId?: number },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let image: string | undefined;
    if (dto.image !== undefined || dto.avatarId !== undefined) {
      image = resolveAvatar(dto.avatarId, dto.image);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(image !== undefined && { image }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        image: true,
        role: true,
      },
    });
  }
}
