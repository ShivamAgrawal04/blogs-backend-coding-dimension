import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createId } from '@paralleldrive/cuid2';
import { Model } from 'mongoose';
import {
  BOOKMARK_MODEL,
  COMMENT_MODEL,
  LIKE_MODEL,
  NOTE_MODEL,
  READ_HISTORY_MODEL,
  SUBJECT_MODEL,
} from '@/database/mongodb/schemas';
import { stripMongoMeta, stripMongoMetaArray } from '@/database/mongodb/mongo.helpers';
import type { BookmarkDocument } from '@/database/mongodb/schemas/bookmarks.schema';
import type { CommentDocument } from '@/database/mongodb/schemas/comments.schema';
import type { LikeDocument } from '@/database/mongodb/schemas/likes.schema';
import type { NoteDocument } from '@/database/mongodb/schemas/notes.schema';
import type { ReadHistoryDocument } from '@/database/mongodb/schemas/read-history.schema';
import type { SubjectDocument } from '@/database/mongodb/schemas/subjects.schema';
import type {
  CreateNoteInput,
  CreateSubjectInput,
  NoteRepository,
  UpdateNoteInput,
  UpdateSubjectInput,
} from '@/database/repositories/interfaces/note.repository';
import {
  buildPaginationMeta,
  slugify,
} from '@/database/repositories/repository.helpers';
import type { NoteEntity, SubjectEntity } from '@/database/types';

@Injectable()
export class MongoNoteRepository implements NoteRepository {
  constructor(
    @InjectModel(NOTE_MODEL)
    private readonly noteModel: Model<NoteDocument>,
    @InjectModel(SUBJECT_MODEL)
    private readonly subjectModel: Model<SubjectDocument>,
    @InjectModel(LIKE_MODEL)
    private readonly likeModel: Model<LikeDocument>,
    @InjectModel(COMMENT_MODEL)
    private readonly commentModel: Model<CommentDocument>,
    @InjectModel(BOOKMARK_MODEL)
    private readonly bookmarkModel: Model<BookmarkDocument>,
    @InjectModel(READ_HISTORY_MODEL)
    private readonly readHistoryModel: Model<ReadHistoryDocument>,
  ) {}

  async list(query: { page?: number; limit?: number; subject?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const filter: Record<string, unknown> = {};

    if (query.subject) {
      const subject = await this.subjectModel.findOne({ slug: query.subject }).lean().exec();
      if (!subject) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      filter.subjectId = subject.id;
    }

    const [rows, total] = await Promise.all([
      this.noteModel
        .find(filter)
        .sort({ sortOrder: 1, title: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<NoteEntity[]>()
        .exec(),
      this.noteModel.countDocuments(filter).exec(),
    ]);

    return {
      data: await Promise.all(rows.map((row) => this.format(row))),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async listSubjects() {
    const subjects = await this.subjectModel
      .find({})
      .sort({ sortOrder: 1, name: 1 })
      .lean<SubjectEntity[]>()
      .exec();

    return Promise.all(
      subjects.map(async (subject) => ({
        ...subject,
        notes: stripMongoMetaArray(
          await this.noteModel
            .find(
              { subjectId: subject.id },
              {
                _id: 0,
                id: 1,
                slug: 1,
                title: 1,
                sortOrder: 1,
                readTime: 1,
                description: 1,
                date: 1,
                updatedAt: 1,
                metaTitle: 1,
                metaDescription: 1,
              },
            )
            .sort({ sortOrder: 1, title: 1 })
            .lean()
            .exec(),
        ),
      })),
    );
  }

  async findSubjectById(id: string): Promise<SubjectEntity | null> {
    return stripMongoMeta(
      await this.subjectModel.findOne({ id }).lean<SubjectEntity>().exec(),
    );
  }

  async findSubjectBySlug(slug: string): Promise<SubjectEntity | null> {
    return stripMongoMeta(
      await this.subjectModel.findOne({ slug }).lean<SubjectEntity>().exec(),
    );
  }

  async countBySubjectId(subjectId: string): Promise<number> {
    return this.noteModel.countDocuments({ subjectId }).exec();
  }

  async createSubject(input: CreateSubjectInput) {
    const document = await this.subjectModel.create({
      id: createId(),
      name: input.name,
      slug: slugify(input.slug?.trim() || input.name),
      icon: input.icon?.trim() || '??',
      sortOrder: input.sortOrder ?? 0,
    });
    return stripMongoMeta(document.toObject()) as SubjectEntity;
  }

  async updateSubject(id: string, input: UpdateSubjectInput) {
    const existing = await this.subjectModel.findOne({ id }).lean<SubjectEntity>().exec();
    if (!existing) {
      return null;
    }

    const updated = await this.subjectModel
      .findOneAndUpdate(
        { id },
        {
          $set: {
            ...(input.name !== undefined && { name: input.name.trim() }),
            ...(input.icon !== undefined && { icon: input.icon.trim() || '??' }),
            ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
            slug:
              input.slug !== undefined || input.name !== undefined
                ? slugify(input.slug?.trim() || input.name || existing.name)
                : existing.slug,
          },
        },
        { new: true },
      )
      .lean<SubjectEntity>()
      .exec();
    return stripMongoMeta(updated) as SubjectEntity | null;
  }

  async deleteSubject(id: string): Promise<boolean> {
    const deleted = await this.subjectModel.deleteOne({ id }).exec();
    return deleted.deletedCount > 0;
  }

  async findByIdOrSlug(idOrSlug: string) {
    const row = await this.noteModel
      .findOne({ $or: [{ id: idOrSlug }, { slug: idOrSlug }] })
      .lean<NoteEntity>()
      .exec();
    return row ? this.format(row) : null;
  }

  async create(_userId: string, input: CreateNoteInput) {
    let slug = slugify(input.slug?.trim() || input.title);
    const existing = await this.noteModel
      .findOne({ subjectId: input.subjectId, slug })
      .lean()
      .exec();
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const id = createId();
    await this.noteModel.create({
      id,
      slug,
      title: input.title,
      description: input.description || '',
      content: input.content,
      date: new Date(),
      readTime: input.readTime || '5 min read',
      views: 0,
      subjectId: input.subjectId,
      sortOrder: input.sortOrder ?? 0,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.findByIdOrSlug(id);
  }

  async update(id: string, input: UpdateNoteInput) {
    const existing = await this.noteModel.findOne({ id }).lean<NoteEntity>().exec();
    if (!existing) {
      return null;
    }

    let slug = existing.slug;
    if (input.slug || input.title) {
      slug = slugify(input.slug?.trim() || input.title || existing.title);
      const clash = await this.noteModel
        .findOne({ subjectId: existing.subjectId, slug })
        .lean()
        .exec();
      if (clash && clash.id !== id) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    await this.noteModel
      .updateOne(
        { id },
        {
          $set: {
            ...(input.title !== undefined && { title: input.title }),
            ...(input.content !== undefined && { content: input.content }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.readTime !== undefined && { readTime: input.readTime }),
            ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
            ...(input.subjectId !== undefined && { subjectId: input.subjectId }),
            ...(input.metaTitle !== undefined && { metaTitle: input.metaTitle }),
            ...(input.metaDescription !== undefined && {
              metaDescription: input.metaDescription,
            }),
            slug,
            updatedAt: new Date(),
          },
        },
      )
      .exec();

    return this.findByIdOrSlug(id);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.noteModel.exists({ id });
    if (!existing) {
      return false;
    }
    await this.cascadeDelete(id);
    return true;
  }

  async listAdmin() {
    const rows = await this.noteModel
      .find({})
      .sort({ createdAt: -1 })
      .lean<NoteEntity[]>()
      .exec();
    return Promise.all(rows.map((row) => this.format(row)));
  }

  private async format(row: NoteEntity) {
    const [subject, likeCount, commentCount] = await Promise.all([
      this.subjectModel.findOne({ id: row.subjectId }).lean<SubjectEntity>().exec(),
      this.likeModel.countDocuments({ noteId: row.id, type: 'LIKE' }).exec(),
      this.commentModel.countDocuments({ noteId: row.id }).exec(),
    ]);

    return {
      ...row,
      subject: stripMongoMeta(subject),
      likeCount,
      commentCount,
    };
  }

  private async cascadeDelete(noteId: string) {
    const commentIds = (
      await this.commentModel.find({ noteId }, { _id: 0, id: 1 }).lean().exec()
    ).map((comment) => comment.id);

    const likeFilters: Array<Record<string, unknown>> = [{ noteId }];
    if (commentIds.length) {
      likeFilters.push({ commentId: { $in: commentIds } });
    }

    await Promise.all([
      this.commentModel.deleteMany({ noteId }).exec(),
      this.likeModel.deleteMany({ $or: likeFilters }).exec(),
      this.bookmarkModel.deleteMany({ noteId }).exec(),
      this.readHistoryModel.deleteMany({ noteId }).exec(),
      this.noteModel.deleteOne({ id: noteId }).exec(),
    ]);
  }
}
