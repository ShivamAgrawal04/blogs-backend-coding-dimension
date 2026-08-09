import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogStatus } from '@prisma/client';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    category?: string;
    tag?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { status: BlogStatus.PUBLISHED };

    if (query.category) {
      where.category = query.category;
    }

    if (query.tag) {
      where.tags = { some: { tag: { slug: query.tag } } };
    }

    const [blogs, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
          tags: {
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    const formatted = blogs.map((blog) => ({
      ...blog,
      tags: blog.tags.map((bt) => bt.tag),
      likeCount: blog._count.likes,
      commentCount: blog._count.comments,
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
    const blog = await this.prisma.blog.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: BlogStatus.PUBLISHED,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true, bio: true },
        },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return {
      ...blog,
      tags: blog.tags.map((bt) => bt.tag),
      likeCount: blog._count.likes,
      commentCount: blog._count.comments,
      _count: undefined,
    };
  }

  async listPublishedSlugs() {
    const blogs = await this.prisma.blog.findMany({
      where: { status: BlogStatus.PUBLISHED },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    return blogs;
  }

  async create(authorId: string, dto: CreateBlogDto) {
    let slug = slugify(dto.slug?.trim() || dto.title);
    if (!slug) {
      throw new BadRequestException('Invalid slug');
    }

    const existing = await this.prisma.blog.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const blog = await this.prisma.blog.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        content: dto.content,
        category: dto.category,
        readTime: dto.readTime || '',
        status: dto.status || BlogStatus.DRAFT,
        featured: dto.featured || false,
        imageGradient: dto.imageGradient || 'from-[#033b2a] to-[#1e4d3a]',
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        publishedAt: dto.status === BlogStatus.PUBLISHED ? new Date() : null,
        authorId,
        tags: dto.tags
          ? {
              create: await Promise.all(
                dto.tags.map(async (tagName) => {
                  const tagSlug = slugify(tagName);
                  const tag = await this.prisma.tag.upsert({
                    where: { slug: tagSlug },
                    update: {},
                    create: { name: tagName, slug: tagSlug },
                  });
                  return { tagId: tag.id };
                }),
              ),
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      ...blog,
      tags: blog.tags.map((bt) => bt.tag),
      likeCount: blog._count.likes,
      commentCount: blog._count.comments,
      _count: undefined,
    };
  }

  async update(id: string, dto: UpdateBlogDto) {
    const existing = await this.prisma.blog.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog not found');
    }

    const data: any = { ...dto };
    delete data.slug;

    if (dto.slug || (dto.title && dto.title !== existing.title)) {
      let newSlug = slugify(dto.slug?.trim() || dto.title || existing.title);
      const slugExists = await this.prisma.blog.findUnique({
        where: { slug: newSlug },
      });
      if (slugExists && slugExists.id !== id) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      data.slug = newSlug;
    }

    if (dto.status === BlogStatus.PUBLISHED && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    if (dto.tags) {
      await this.prisma.blogTag.deleteMany({ where: { blogId: id } });

      const tagCreates = await Promise.all(
        dto.tags.map(async (tagName) => {
          const tagSlug = slugify(tagName);
          const tag = await this.prisma.tag.upsert({
            where: { slug: tagSlug },
            update: {},
            create: { name: tagName, slug: tagSlug },
          });
          return { blogId: id, tagId: tag.id };
        }),
      );

      await this.prisma.blogTag.createMany({ data: tagCreates });
      delete data.tags;
    }

    const blog = await this.prisma.blog.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true, image: true } },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      ...blog,
      tags: blog.tags.map((bt) => bt.tag),
      likeCount: blog._count.likes,
      commentCount: blog._count.comments,
      _count: undefined,
    };
  }

  async delete(id: string) {
    const existing = await this.prisma.blog.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog not found');
    }

    await this.prisma.blog.delete({ where: { id } });
    return { message: 'Blog deleted successfully' };
  }

  async findAllAdmin() {
    const blogs = await this.prisma.blog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, image: true } },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return blogs.map((blog) => ({
      ...blog,
      tags: blog.tags.map((bt) => bt.tag),
      likeCount: blog._count.likes,
      commentCount: blog._count.comments,
      _count: undefined,
    }));
  }
}
