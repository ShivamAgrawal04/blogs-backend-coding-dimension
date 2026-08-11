import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BLOG_MODEL,
  BLOG_TAG_MODEL,
  NOTE_MODEL,
  SUBJECT_MODEL,
  TAG_MODEL,
  USER_MODEL,
} from '@/database/mongodb/schemas';
import { stripMongoMeta, stripMongoMetaArray } from '@/database/mongodb/mongo.helpers';
import type { BlogDocument } from '@/database/mongodb/schemas/blogs.schema';
import type { BlogTagDocument } from '@/database/mongodb/schemas/blog-tags.schema';
import type { NoteDocument } from '@/database/mongodb/schemas/notes.schema';
import type { SubjectDocument } from '@/database/mongodb/schemas/subjects.schema';
import type { TagDocument } from '@/database/mongodb/schemas/tags.schema';
import type { UserDocument } from '@/database/mongodb/schemas/users.schema';
import type { SearchRepository } from '@/database/repositories/interfaces/search.repository';
import { escapeRegex } from '@/database/repositories/repository.helpers';
import type { BlogEntity, NoteEntity, SubjectEntity, TagEntity } from '@/database/types';

@Injectable()
export class MongoSearchRepository implements SearchRepository {
  constructor(
    @InjectModel(BLOG_MODEL)
    private readonly blogModel: Model<BlogDocument>,
    @InjectModel(NOTE_MODEL)
    private readonly noteModel: Model<NoteDocument>,
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(TAG_MODEL)
    private readonly tagModel: Model<TagDocument>,
    @InjectModel(BLOG_TAG_MODEL)
    private readonly blogTagModel: Model<BlogTagDocument>,
    @InjectModel(SUBJECT_MODEL)
    private readonly subjectModel: Model<SubjectDocument>,
  ) {}

  async search(query: string) {
    const term = query.trim();
    if (!term) {
      return { blogs: [], notes: [], totalResults: 0 };
    }

    const regex = new RegExp(escapeRegex(term), 'i');
    const [blogs, notes] = await Promise.all([
      this.blogModel
        .find({
          status: 'PUBLISHED',
          $or: [
            { title: regex },
            { description: regex },
            { content: regex },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean<BlogEntity[]>()
        .exec(),
      this.noteModel
        .find({
          $or: [
            { title: regex },
            { description: regex },
            { content: regex },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean<NoteEntity[]>()
        .exec(),
    ]);

    const formattedBlogs = await Promise.all(blogs.map((blog) => this.formatBlog(blog)));
    const formattedNotes = await Promise.all(notes.map((note) => this.formatNote(note)));

    return {
      blogs: formattedBlogs,
      notes: formattedNotes,
      totalResults: formattedBlogs.length + formattedNotes.length,
    };
  }

  private async formatBlog(blog: BlogEntity) {
    const [author, tags] = await Promise.all([
      this.userModel
        .findOne({ id: blog.authorId }, { _id: 0, id: 1, name: 1, image: 1 })
        .lean()
        .exec(),
      this.getTags(blog.id),
    ]);

    return {
      ...blog,
      author: stripMongoMeta(author),
      tags,
    };
  }

  private async formatNote(note: NoteEntity) {
    const subject = await this.subjectModel
      .findOne({ id: note.subjectId }, { _id: 0, id: 1, name: 1, slug: 1, icon: 1 })
      .lean<SubjectEntity>()
      .exec();

    return {
      ...note,
      subject: stripMongoMeta(subject),
    };
  }

  private async getTags(blogId: string): Promise<TagEntity[]> {
    const links = await this.blogTagModel.find({ blogId }).lean<BlogTagDocument[]>().exec();
    if (!links.length) {
      return [];
    }
    const tags = await this.tagModel
      .find({ id: { $in: links.map((link) => link.tagId) } })
      .lean<TagEntity[]>()
      .exec();
    const tagMap = new Map(tags.map((tag) => [tag.id, stripMongoMeta(tag) as TagEntity]));
    return links
      .map((link) => tagMap.get(link.tagId))
      .filter((tag): tag is TagEntity => !!tag);
  }
}
