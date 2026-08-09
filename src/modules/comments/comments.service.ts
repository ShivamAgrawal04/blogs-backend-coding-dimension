import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async findMany(query: {
    blogId?: string;
    noteId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { parentId: null };

    if (query.blogId) {
      where.blogId = query.blogId;
    } else if (query.noteId) {
      where.noteId = query.noteId;
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
          replies: {
            include: {
              user: {
                select: { id: true, name: true, image: true },
              },
              _count: {
                select: { likes: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { likes: true },
          },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(
    userId: string,
    dto: { text: string; blogId?: string; noteId?: string; parentId?: string },
  ) {
    if (!dto.blogId && !dto.noteId) {
      throw new BadRequestException('Either blogId or noteId must be provided');
    }

    if (dto.blogId) {
      const blog = await this.prisma.blog.findUnique({
        where: { id: dto.blogId },
      });
      if (!blog) throw new NotFoundException('Blog not found');
    }

    if (dto.noteId) {
      const note = await this.prisma.note.findUnique({
        where: { id: dto.noteId },
      });
      if (!note) throw new NotFoundException('Note not found');
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
    }

    return this.prisma.comment.create({
      data: {
        text: dto.text,
        userId,
        blogId: dto.blogId,
        noteId: dto.noteId,
        parentId: dto.parentId,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { likes: true },
        },
      },
    });
  }

  async update(id: string, userId: string, text: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new BadRequestException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { text },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { likes: true },
        },
      },
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new BadRequestException('Not authorized to delete this comment');
    }

    await this.prisma.comment.delete({ where: { id } });
    return { message: 'Comment deleted successfully' };
  }
}
