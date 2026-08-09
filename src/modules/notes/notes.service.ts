import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class NoteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    subject?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.subject) {
      where.subject = { slug: query.subject };
    }

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          subject: true,
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.note.count({ where }),
    ]);

    const formatted = notes.map((note) => ({
      ...note,
      likeCount: note._count.likes,
      commentCount: note._count.comments,
      _count: undefined,
    }));

    return {
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string) {
    const note = await this.prisma.note.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        subject: true,
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return {
      ...note,
      likeCount: note._count.likes,
      commentCount: note._count.comments,
      _count: undefined,
    };
  }

  async create(authorId: string, dto: CreateNoteDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      throw new BadRequestException('Subject not found');
    }

    let slug = slugify(dto.title);

    const existing = await this.prisma.note.findUnique({
      where: { subjectId_slug: { subjectId: dto.subjectId, slug } },
    });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const note = await this.prisma.note.create({
      data: {
        title: dto.title,
        slug,
        content: dto.content,
        description: dto.description || '',
        readTime: dto.readTime || '',
        sortOrder: dto.sortOrder || 0,
        subjectId: dto.subjectId,
      },
      include: {
        subject: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      ...note,
      likeCount: note._count.likes,
      commentCount: note._count.comments,
      _count: undefined,
    };
  }

  async update(id: string, dto: UpdateNoteDto) {
    const existing = await this.prisma.note.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    if (dto.subjectId && dto.subjectId !== existing.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });
      if (!subject) {
        throw new BadRequestException('Subject not found');
      }
    }

    const data: any = { ...dto };

    if (dto.title && dto.title !== existing.title) {
      const subjectId = dto.subjectId || existing.subjectId;
      let newSlug = slugify(dto.title);

      const slugExists = await this.prisma.note.findUnique({
        where: { subjectId_slug: { subjectId, slug: newSlug } },
      });
      if (slugExists && slugExists.id !== id) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      data.slug = newSlug;
    }

    const note = await this.prisma.note.update({
      where: { id },
      data,
      include: {
        subject: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      ...note,
      likeCount: note._count.likes,
      commentCount: note._count.comments,
      _count: undefined,
    };
  }

  async delete(id: string) {
    const existing = await this.prisma.note.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    await this.prisma.note.delete({ where: { id } });
    return { message: 'Note deleted successfully' };
  }

  async findAllAdmin() {
    const notes = await this.prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subject: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    return notes.map((note) => ({
      ...note,
      likeCount: note._count.likes,
      commentCount: note._count.comments,
      _count: undefined,
    }));
  }
}
