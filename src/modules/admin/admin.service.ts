import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      totalBlogs,
      totalNotes,
      totalComments,
      pageViews,
      totalSubscribers,
      recentUsers,
      recentBlogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.blog.count(),
      this.prisma.note.count(),
      this.prisma.comment.count(),
      this.prisma.pageView.count(),
      this.prisma.newsletterSubscriber.count(),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
          _count: {
            select: {
              blogs: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.blog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
    ]);

    return {
      totalUsers,
      totalBlogs,
      totalNotes,
      totalComments,
      pageViews,
      totalSubscribers,
      recentUsers,
      recentBlogs,
    };
  }

  async getUsers(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const search = query.search || '';

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          bio: true,
          createdAt: true,
          _count: {
            select: {
              blogs: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        totalBlogs: u._count.blogs,
        totalComments: u._count.comments,
        _count: undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async changeRole(userId: string, role: 'USER' | 'ADMIN') {
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async getAllBlogs() {
    const blogs = await this.prisma.blog.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        status: true,
        views: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });
    return { blogs };
  }

  async deleteBlog(blogId: string) {
    const blog = await this.prisma.blog.findUnique({ where: { id: blogId } });
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return this.prisma.blog.delete({ where: { id: blogId } });
  }

  async getAllNotes() {
    return this.prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        subject: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });
  }
}
