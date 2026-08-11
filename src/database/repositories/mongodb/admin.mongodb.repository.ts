import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isSuperAdminEmail } from '@/common/roles';
import {
  BLOG_MODEL,
  BLOG_TAG_MODEL,
  BOOKMARK_MODEL,
  COMMENT_MODEL,
  LIKE_MODEL,
  NEWSLETTER_SUBSCRIBER_MODEL,
  NOTE_MODEL,
  PAGE_VIEW_MODEL,
  READ_HISTORY_MODEL,
  SUBJECT_MODEL,
  USER_MODEL,
} from '@/database/mongodb/schemas';
import { stripMongoMeta, stripMongoMetaArray } from '@/database/mongodb/mongo.helpers';
import type { BlogDocument } from '@/database/mongodb/schemas/blogs.schema';
import type { BlogTagDocument } from '@/database/mongodb/schemas/blog-tags.schema';
import type { BookmarkDocument } from '@/database/mongodb/schemas/bookmarks.schema';
import type { CommentDocument } from '@/database/mongodb/schemas/comments.schema';
import type { LikeDocument } from '@/database/mongodb/schemas/likes.schema';
import type { NewsletterSubscriberDocument } from '@/database/mongodb/schemas/newsletter-subscribers.schema';
import type { NoteDocument } from '@/database/mongodb/schemas/notes.schema';
import type { PageViewDocument } from '@/database/mongodb/schemas/page-views.schema';
import type { ReadHistoryDocument } from '@/database/mongodb/schemas/read-history.schema';
import type { SubjectDocument } from '@/database/mongodb/schemas/subjects.schema';
import type { UserDocument } from '@/database/mongodb/schemas/users.schema';
import type {
  AdminActor,
  AdminRepository,
  AdminUserListQuery,
} from '@/database/repositories/interfaces/admin.repository';
import { escapeRegex } from '@/database/repositories/repository.helpers';
import type { BlogEntity, NoteEntity, SubjectEntity, UserEntity, UserRole } from '@/database/types';

@Injectable()
export class MongoAdminRepository implements AdminRepository {
  constructor(
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(BLOG_MODEL)
    private readonly blogModel: Model<BlogDocument>,
    @InjectModel(NOTE_MODEL)
    private readonly noteModel: Model<NoteDocument>,
    @InjectModel(COMMENT_MODEL)
    private readonly commentModel: Model<CommentDocument>,
    @InjectModel(PAGE_VIEW_MODEL)
    private readonly pageViewModel: Model<PageViewDocument>,
    @InjectModel(NEWSLETTER_SUBSCRIBER_MODEL)
    private readonly newsletterModel: Model<NewsletterSubscriberDocument>,
    @InjectModel(LIKE_MODEL)
    private readonly likeModel: Model<LikeDocument>,
    @InjectModel(SUBJECT_MODEL)
    private readonly subjectModel: Model<SubjectDocument>,
    @InjectModel(BLOG_TAG_MODEL)
    private readonly blogTagModel: Model<BlogTagDocument>,
    @InjectModel(BOOKMARK_MODEL)
    private readonly bookmarkModel: Model<BookmarkDocument>,
    @InjectModel(READ_HISTORY_MODEL)
    private readonly readHistoryModel: Model<ReadHistoryDocument>,
  ) {}

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
      this.userModel.countDocuments({}).exec(),
      this.blogModel.countDocuments({}).exec(),
      this.noteModel.countDocuments({}).exec(),
      this.commentModel.countDocuments({}).exec(),
      this.pageViewModel.countDocuments({}).exec(),
      this.newsletterModel.countDocuments({}).exec(),
      this.userModel
        .find({}, { _id: 0, id: 1, name: 1, email: 1, role: 1, image: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
      this.blogModel
        .find({}, { _id: 0, id: 1, title: 1, slug: 1, status: 1, createdAt: 1, authorId: 1 })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean<BlogEntity[]>()
        .exec(),
    ]);

    return {
      totalUsers,
      totalBlogs,
      totalNotes,
      totalComments,
      pageViews,
      totalSubscribers,
      recentUsers: stripMongoMetaArray(recentUsers),
      recentBlogs: await Promise.all(
        recentBlogs.map(async (blog) => ({
          ...blog,
          author: stripMongoMeta(
            await this.userModel
              .findOne({ id: blog.authorId }, { _id: 0, id: 1, name: 1, image: 1 })
              .lean()
              .exec(),
          ),
        })),
      ),
    };
  }

  async getUsers(query: AdminUserListQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const filter = query.search?.trim()
      ? {
          $or: [
            { name: new RegExp(escapeRegex(query.search.trim()), 'i') },
            { email: new RegExp(escapeRegex(query.search.trim()), 'i') },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.userModel
        .find(
          filter,
          { _id: 0, id: 1, name: 1, email: 1, role: 1, image: 1, bio: 1, createdAt: 1 },
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<UserEntity[]>()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const users = await Promise.all(
      rows.map(async (user) => {
        const [blogCount, commentCount] = await Promise.all([
          this.blogModel.countDocuments({ authorId: user.id }).exec(),
          this.commentModel.countDocuments({ userId: user.id }).exec(),
        ]);
        return {
          ...user,
          totalBlogs: blogCount,
          totalComments: commentCount,
          isSuperAdmin: isSuperAdminEmail(user.email),
        };
      }),
    );

    return {
      users,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async changeRole(actor: AdminActor, userId: string, role: UserRole) {
    if (actor.id === userId) {
      return null;
    }

    const user = await this.userModel.findOne({ id: userId }).lean<UserEntity>().exec();
    if (!user || isSuperAdminEmail(user.email)) {
      return null;
    }

    const updated = await this.userModel
      .findOneAndUpdate(
        { id: userId },
        { $set: { role, updatedAt: new Date() } },
        {
          new: true,
          projection: { _id: 0, id: 1, name: 1, email: 1, role: 1 },
        },
      )
      .lean()
      .exec();
    return stripMongoMeta(updated);
  }

  async getAllBlogs() {
    const blogs = await this.blogModel
      .find({})
      .sort({ createdAt: -1 })
      .lean<BlogEntity[]>()
      .exec();

    return {
      blogs: await Promise.all(
        blogs.map(async (blog) => {
          const [author, commentCount, likeCount] = await Promise.all([
            this.userModel
              .findOne({ id: blog.authorId }, { _id: 0, id: 1, name: 1, image: 1 })
              .lean()
              .exec(),
            this.commentModel.countDocuments({ blogId: blog.id }).exec(),
            this.likeModel.countDocuments({ blogId: blog.id, type: 'LIKE' }).exec(),
          ]);
          return {
            ...blog,
            author: stripMongoMeta(author),
            _count: { comments: commentCount, likes: likeCount },
          };
        }),
      ),
    };
  }

  async deleteBlog(blogId: string): Promise<boolean> {
    const existing = await this.blogModel.exists({ id: blogId });
    if (!existing) {
      return false;
    }

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
    return true;
  }

  async getAllNotes() {
    const notes = await this.noteModel
      .find({})
      .sort({ createdAt: -1 })
      .lean<NoteEntity[]>()
      .exec();

    return Promise.all(
      notes.map(async (note) => {
        const [subject, commentCount, likeCount] = await Promise.all([
          this.subjectModel.findOne({ id: note.subjectId }).lean<SubjectEntity>().exec(),
          this.commentModel.countDocuments({ noteId: note.id }).exec(),
          this.likeModel.countDocuments({ noteId: note.id, type: 'LIKE' }).exec(),
        ]);
        return {
          id: note.id,
          title: note.title,
          slug: note.slug,
          subject: stripMongoMeta(subject),
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          _count: { comments: commentCount, likes: likeCount },
        };
      }),
    );
  }
}
