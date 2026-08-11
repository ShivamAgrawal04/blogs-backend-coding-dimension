import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createId } from '@paralleldrive/cuid2';
import { Model } from 'mongoose';
import {
  BLOG_MODEL,
  BLOG_TAG_MODEL,
  BOOKMARK_MODEL,
  COMMENT_MODEL,
  LIKE_MODEL,
  READ_HISTORY_MODEL,
  TAG_MODEL,
  USER_MODEL,
} from '@/database/mongodb/schemas';
import { stripMongoMeta, stripMongoMetaArray } from '@/database/mongodb/mongo.helpers';
import type { BlogDocument } from '@/database/mongodb/schemas/blogs.schema';
import type { BlogTagDocument } from '@/database/mongodb/schemas/blog-tags.schema';
import type { BookmarkDocument } from '@/database/mongodb/schemas/bookmarks.schema';
import type { CommentDocument } from '@/database/mongodb/schemas/comments.schema';
import type { LikeDocument } from '@/database/mongodb/schemas/likes.schema';
import type { ReadHistoryDocument } from '@/database/mongodb/schemas/read-history.schema';
import type { TagDocument } from '@/database/mongodb/schemas/tags.schema';
import type { UserDocument } from '@/database/mongodb/schemas/users.schema';
import type {
  BlogRepository,
  CreateBlogInput,
  UpdateBlogInput,
} from '@/database/repositories/interfaces/blog.repository';
import {
  buildPaginationMeta,
  slugify,
} from '@/database/repositories/repository.helpers';
import type { BlogEntity, TagEntity } from '@/database/types';

@Injectable()
export class MongoBlogRepository implements BlogRepository {
  constructor(
    @InjectModel(BLOG_MODEL)
    private readonly blogModel: Model<BlogDocument>,
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(TAG_MODEL)
    private readonly tagModel: Model<TagDocument>,
    @InjectModel(BLOG_TAG_MODEL)
    private readonly blogTagModel: Model<BlogTagDocument>,
    @InjectModel(LIKE_MODEL)
    private readonly likeModel: Model<LikeDocument>,
    @InjectModel(COMMENT_MODEL)
    private readonly commentModel: Model<CommentDocument>,
    @InjectModel(BOOKMARK_MODEL)
    private readonly bookmarkModel: Model<BookmarkDocument>,
    @InjectModel(READ_HISTORY_MODEL)
    private readonly readHistoryModel: Model<ReadHistoryDocument>,
  ) {}

  async listPublished(query: { page?: number; limit?: number; category?: string; tag?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const filter: Record<string, unknown> = { status: 'PUBLISHED' };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.tag) {
      const tag = await this.tagModel.findOne({ slug: query.tag }).lean().exec();
      if (!tag) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      const links = await this.blogTagModel.find({ tagId: tag.id }).lean().exec();
      const blogIds = links.map((link) => link.blogId);
      if (!blogIds.length) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      filter.id = { $in: blogIds };
    }

    const [rows, total] = await Promise.all([
      this.blogModel
        .find(filter)
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<BlogEntity[]>()
        .exec(),
      this.blogModel.countDocuments(filter).exec(),
    ]);

    return {
      data: await Promise.all(rows.map((row) => this.format(row))),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findPublishedByIdOrSlug(idOrSlug: string) {
    const row = await this.blogModel
      .findOne({
        status: 'PUBLISHED',
        $or: [{ id: idOrSlug }, { slug: idOrSlug }],
      })
      .lean<BlogEntity>()
      .exec();
    return row ? this.format(row) : null;
  }

  async listPublishedSlugs() {
    return stripMongoMetaArray(
      await this.blogModel
        .find(
          { status: 'PUBLISHED' },
          { _id: 0, slug: 1, updatedAt: 1, publishedAt: 1 },
        )
        .sort({ publishedAt: -1 })
        .lean()
        .exec(),
    ) as Array<Pick<BlogEntity, 'slug' | 'updatedAt' | 'publishedAt'>>;
  }

  async create(authorId: string, input: CreateBlogInput) {
    let slug = slugify(input.slug?.trim() || input.title);
    if (await this.blogModel.exists({ slug })) {
      slug = `${slug}-${Date.now()}`;
    }

    const id = createId();
    await this.blogModel.create({
      id,
      title: input.title,
      slug,
      description: input.description,
      content: input.content,
      category: input.category,
      readTime: input.readTime || '',
      status: input.status || 'DRAFT',
      featured: input.featured || false,
      imageGradient: input.imageGradient || 'from-[#033b2a] to-[#1e4d3a]',
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      views: 0,
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      authorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.setTags(id, input.tags);
    return this.findAdminById(id);
  }

  async update(id: string, input: UpdateBlogInput) {
    const existing = await this.blogModel.findOne({ id }).lean<BlogEntity>().exec();
    if (!existing) {
      return null;
    }

    const { tags, slug: requestedSlug, ...values } = input;
    let slug = existing.slug;
    if (requestedSlug || (input.title && input.title !== existing.title)) {
      slug = slugify(requestedSlug?.trim() || input.title || existing.title);
      const duplicate = await this.blogModel.findOne({ slug }).lean().exec();
      if (duplicate && duplicate.id !== id) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    await this.blogModel
      .updateOne(
        { id },
        {
          $set: {
            ...values,
            ...(requestedSlug !== undefined || input.title ? { slug } : {}),
            ...(input.status === 'PUBLISHED' && !existing.publishedAt
              ? { publishedAt: new Date() }
              : {}),
            updatedAt: new Date(),
          },
        },
      )
      .exec();

    if (tags) {
      await this.blogTagModel.deleteMany({ blogId: id }).exec();
      await this.setTags(id, tags);
    }

    return this.findAdminById(id);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.blogModel.exists({ id });
    if (!existing) {
      return false;
    }
    await this.cascadeDelete(id);
    return true;
  }

  async listAdmin() {
    const rows = await this.blogModel
      .find({})
      .sort({ createdAt: -1 })
      .lean<BlogEntity[]>()
      .exec();
    return Promise.all(rows.map((row) => this.format(row)));
  }

  async findAdminById(id: string) {
    const row = await this.blogModel.findOne({ id }).lean<BlogEntity>().exec();
    return row ? this.format(row) : null;
  }

  private async format(row: BlogEntity) {
    const [author, tags, likeCount, commentCount] = await Promise.all([
      this.userModel
        .findOne(
          { id: row.authorId },
          { _id: 0, id: 1, name: 1, image: 1, bio: 1 },
        )
        .lean()
        .exec(),
      this.getTags(row.id),
      this.likeModel.countDocuments({ blogId: row.id }).exec(),
      this.commentModel.countDocuments({ blogId: row.id }).exec(),
    ]);

    return {
      ...row,
      author: stripMongoMeta(author),
      tags,
      likeCount,
      commentCount,
    };
  }

  private async getTags(blogId: string): Promise<TagEntity[]> {
    const links = await this.blogTagModel.find({ blogId }).lean<BlogTagDocument[]>().exec();
    if (!links.length) {
      return [];
    }
    const tagDocuments = await this.tagModel
      .find({ id: { $in: links.map((link) => link.tagId) } })
      .lean<TagEntity[]>()
      .exec();
    const tagMap = new Map(tagDocuments.map((tag) => [tag.id, stripMongoMeta(tag) as TagEntity]));
    return links
      .map((link) => tagMap.get(link.tagId))
      .filter((tag): tag is TagEntity => !!tag);
  }

  private async setTags(blogId: string, names?: string[]) {
    for (const rawName of names || []) {
      const name = rawName.trim();
      const slug = slugify(name);
      let tag = await this.tagModel.findOne({ slug }).lean<TagEntity>().exec();
      if (!tag) {
        const created = await this.tagModel.create({
          id: createId(),
          name,
          slug,
        });
        tag = stripMongoMeta(created.toObject()) as TagEntity;
      }

      await this.blogTagModel
        .updateOne(
          { blogId, tagId: tag.id },
          { $setOnInsert: { blogId, tagId: tag.id } },
          { upsert: true },
        )
        .exec();
    }
  }

  private async cascadeDelete(blogId: string) {
    const commentIds = (
      await this.commentModel.find({ blogId }, { _id: 0, id: 1 }).lean().exec()
    ).map((comment) => comment.id);

    const likeFilters: Array<Record<string, unknown>> = [{ blogId }];
    if (commentIds.length) {
      likeFilters.push({ commentId: { $in: commentIds } });
    }

    await Promise.all([
      this.blogTagModel.deleteMany({ blogId }).exec(),
      this.commentModel.deleteMany({ blogId }).exec(),
      this.likeModel.deleteMany({ $or: likeFilters }).exec(),
      this.bookmarkModel.deleteMany({ blogId }).exec(),
      this.readHistoryModel.deleteMany({ blogId }).exec(),
      this.blogModel.deleteOne({ id: blogId }).exec(),
    ]);
  }
}
