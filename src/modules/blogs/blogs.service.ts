import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BLOG_REPOSITORY } from '@/database/database.tokens';
import type {
  BlogRepository,
  CreateBlogInput,
  UpdateBlogInput,
} from '@/database/repositories/interfaces/blog.repository';
import { slugify } from '@/database/repositories/repository.helpers';
import { CreateBlogDto } from '@/modules/blogs/dto/create-blog.dto';
import { UpdateBlogDto } from '@/modules/blogs/dto/update-blog.dto';

@Injectable()
export class BlogService {
  constructor(
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: BlogRepository,
  ) {}

  async findAll(query: { page?: number; limit?: number; category?: string; tag?: string }) {
    return this.blogRepository.listPublished(query);
  }

  async findOne(idOrSlug: string) {
    const row = await this.blogRepository.findPublishedByIdOrSlug(idOrSlug);
    if (!row) throw new NotFoundException('Blog not found');
    return row;
  }

  listPublishedSlugs() {
    return this.blogRepository.listPublishedSlugs();
  }

  async create(authorId: string, dto: CreateBlogDto) {
    const slug = slugify(dto.slug?.trim() || dto.title);
    if (!slug) throw new BadRequestException('Invalid slug');
    return this.blogRepository.create(authorId, dto as CreateBlogInput);
  }

  async update(id: string, dto: UpdateBlogDto) {
    const updated = await this.blogRepository.update(id, dto as UpdateBlogInput);
    if (!updated) throw new NotFoundException('Blog not found');
    return updated;
  }

  async delete(id: string) {
    const deleted = await this.blogRepository.delete(id);
    if (!deleted) throw new NotFoundException('Blog not found');
    return { message: 'Blog deleted successfully' };
  }

  async findAllAdmin() {
    return this.blogRepository.listAdmin();
  }
}
