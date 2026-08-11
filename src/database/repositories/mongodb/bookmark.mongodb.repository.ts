import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createId } from '@paralleldrive/cuid2';
import { Model } from 'mongoose';
import {
  BLOG_MODEL,
  BOOKMARK_MODEL,
  COMMENT_MODEL,
  LIKE_MODEL,
  NOTE_MODEL,
  SUBJECT_MODEL,
  USER_MODEL,
} from '@/database/mongodb/schemas';
import { stripMongoMeta } from '@/database/mongodb/mongo.helpers';
import type { BlogDocument } from '@/database/mongodb/schemas/blogs.schema';
import type { BookmarkDocument } from '@/database/mongodb/schemas/bookmarks.schema';
import type { CommentDocument } from '@/database/mongodb/schemas/comments.schema';
import type { LikeDocument } from '@/database/mongodb/schemas/likes.schema';
import type { NoteDocument } from '@/database/mongodb/schemas/notes.schema';
import type { SubjectDocument } from '@/database/mongodb/schemas/subjects.schema';
import type { UserDocument } from '@/database/mongodb/schemas/users.schema';
import type { BookmarkRepository } from '@/database/repositories/interfaces/bookmark.repository';
import type { BlogEntity, NoteEntity, SubjectEntity } from '@/database/types';

@Injectable()
export class MongoBookmarkRepository implements BookmarkRepository {
  constructor(
    @InjectModel(BOOKMARK_MODEL)
    private readonly bookmarkModel: Model<BookmarkDocument>,
    @InjectModel(BLOG_MODEL)
    private readonly blogModel: Model<BlogDocument>,
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(NOTE_MODEL)
    private readonly noteModel: Model<NoteDocument>,
    @InjectModel(SUBJECT_MODEL)
    private readonly subjectModel: Model<SubjectDocument>,
    @InjectModel(LIKE_MODEL)
    private readonly likeModel: Model<LikeDocument>,
    @InjectModel(COMMENT_MODEL)
    private readonly commentModel: Model<CommentDocument>,
  ) {}

  async toggle(userId: string, input: { blogId?: string; noteId?: string }) {
    const target = this.targetFilter(input.blogId, input.noteId);
    const existing = await this.bookmarkModel.findOne({ userId, ...target }).lean().exec();

    if (existing) {
      await this.bookmarkModel.deleteOne({ id: existing.id }).exec();
      return { bookmarked: false };
    }

    await this.bookmarkModel.create({
      id: createId(),
      userId,
      blogId: input.blogId ?? null,
      noteId: input.noteId ?? null,
      createdAt: new Date(),
    });
    return { bookmarked: true };
  }

  async getUserBookmarks(userId: string) {
    const items = await this.bookmarkModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean<BookmarkDocument[]>()
      .exec();

    return Promise.all(
      items.map(async (item) => {
        let blog = null;
        let note = null;

        if (item.blogId) {
          blog = await this.buildBlogBookmark(item.blogId);
        } else if (item.noteId) {
          note = await this.buildNoteBookmark(item.noteId);
        }

        return { ...stripMongoMeta(item), blog, note };
      }),
    );
  }

  async isBookmarked(
    userId: string,
    blogId?: string,
    noteId?: string,
  ): Promise<boolean> {
    return !!(await this.bookmarkModel
      .exists({ userId, ...this.targetFilter(blogId, noteId) })
      .exec());
  }

  private async buildBlogBookmark(blogId: string) {
    const blog = await this.blogModel.findOne({ id: blogId }).lean<BlogEntity>().exec();
    if (!blog) {
      return null;
    }

    const [author, likeCount, commentCount] = await Promise.all([
      this.userModel
        .findOne({ id: blog.authorId }, { _id: 0, id: 1, name: 1, image: 1 })
        .lean()
        .exec(),
      this.likeModel.countDocuments({ blogId }).exec(),
      this.commentModel.countDocuments({ blogId }).exec(),
    ]);

    return {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      description: blog.description,
      category: blog.category,
      readTime: blog.readTime,
      imageGradient: blog.imageGradient,
      author: stripMongoMeta(author),
      _count: { likes: likeCount, comments: commentCount },
    };
  }

  private async buildNoteBookmark(noteId: string) {
    const note = await this.noteModel.findOne({ id: noteId }).lean<NoteEntity>().exec();
    if (!note) {
      return null;
    }

    const [subject, likeCount, commentCount] = await Promise.all([
      this.subjectModel.findOne({ id: note.subjectId }).lean<SubjectEntity>().exec(),
      this.likeModel.countDocuments({ noteId }).exec(),
      this.commentModel.countDocuments({ noteId }).exec(),
    ]);

    return {
      id: note.id,
      title: note.title,
      slug: note.slug,
      description: note.description,
      readTime: note.readTime,
      subject: stripMongoMeta(subject),
      _count: { likes: likeCount, comments: commentCount },
    };
  }

  private targetFilter(blogId?: string, noteId?: string) {
    if (blogId) return { blogId };
    if (noteId) return { noteId };
    throw new BadRequestException('blogId or noteId is required');
  }
}
