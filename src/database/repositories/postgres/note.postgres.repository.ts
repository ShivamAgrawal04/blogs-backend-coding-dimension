import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, or, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { comments, likes, notes, subjects } from '@/db/schema';
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

@Injectable()
export class PostgresNoteRepository implements NoteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(query: { page?: number; limit?: number; subject?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const conditions: SQL[] = [];

    if (query.subject) {
      const [subject] = await this.db
        .select()
        .from(subjects)
        .where(eq(subjects.slug, query.subject))
        .limit(1);
      if (!subject) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      conditions.push(eq(notes.subjectId, subject.id));
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, total] = await Promise.all([
      this.db.query.notes.findMany({
        where,
        with: { subject: true },
        orderBy: [asc(notes.sortOrder), asc(notes.title)],
        limit,
        offset: (page - 1) * limit,
      }),
      this.db.select({ value: count() }).from(notes).where(where),
    ]);

    return {
      data: await Promise.all(rows.map((row) => this.format(row))),
      meta: buildPaginationMeta(total[0]?.value ?? 0, page, limit),
    };
  }

  async listSubjects() {
    const rows = await this.db.query.subjects.findMany({
      with: {
        notes: {
          columns: {
            id: true,
            slug: true,
            title: true,
            sortOrder: true,
            readTime: true,
            description: true,
            date: true,
            updatedAt: true,
            metaTitle: true,
            metaDescription: true,
          },
        },
      },
      orderBy: [asc(subjects.sortOrder), asc(subjects.name)],
    });

    return rows.map((subject) => ({
      ...subject,
      notes: [...subject.notes].sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }

  async findSubjectById(id: string) {
    const [subject] = await this.db
      .select()
      .from(subjects)
      .where(eq(subjects.id, id))
      .limit(1);
    return subject ?? null;
  }

  async findSubjectBySlug(slug: string) {
    const [subject] = await this.db
      .select()
      .from(subjects)
      .where(eq(subjects.slug, slug))
      .limit(1);
    return subject ?? null;
  }

  async countBySubjectId(subjectId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(notes)
      .where(eq(notes.subjectId, subjectId));
    return result?.value ?? 0;
  }

  async createSubject(input: CreateSubjectInput) {
    const [subject] = await this.db
      .insert(subjects)
      .values({
        id: createId(),
        name: input.name,
        slug: slugify(input.slug?.trim() || input.name),
        icon: input.icon?.trim() || '??',
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return subject;
  }

  async updateSubject(id: string, input: UpdateSubjectInput) {
    const [existing] = await this.db
      .select()
      .from(subjects)
      .where(eq(subjects.id, id))
      .limit(1);
    if (!existing) {
      return null;
    }

    const slug =
      input.slug !== undefined || input.name !== undefined
        ? slugify(input.slug?.trim() || input.name || existing.name)
        : existing.slug;

    const [updated] = await this.db
      .update(subjects)
      .set({
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.icon !== undefined && { icon: input.icon.trim() || '??' }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        slug,
      })
      .where(eq(subjects.id, id))
      .returning();
    return updated ?? null;
  }

  async deleteSubject(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(subjects)
      .where(eq(subjects.id, id))
      .returning({ id: subjects.id });
    return deleted.length > 0;
  }

  async findByIdOrSlug(idOrSlug: string) {
    const row = await this.db.query.notes.findFirst({
      where: or(eq(notes.id, idOrSlug), eq(notes.slug, idOrSlug)),
      with: { subject: true },
    });
    return row ? this.format(row) : null;
  }

  async create(_userId: string, input: CreateNoteInput) {
    let slug = slugify(input.slug?.trim() || input.title);
    const [existing] = await this.db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.subjectId, input.subjectId), eq(notes.slug, slug)))
      .limit(1);
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const id = createId();
    await this.db.insert(notes).values({
      id,
      slug,
      title: input.title,
      content: input.content,
      description: input.description || '',
      readTime: input.readTime || '5 min read',
      subjectId: input.subjectId,
      sortOrder: input.sortOrder ?? 0,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    });

    return this.findByIdOrSlug(id);
  }

  async update(id: string, input: UpdateNoteInput) {
    const [existing] = await this.db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!existing) {
      return null;
    }

    let slug = existing.slug;
    if (input.slug || input.title) {
      slug = slugify(input.slug?.trim() || input.title || existing.title);
      const [clash] = await this.db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.subjectId, existing.subjectId), eq(notes.slug, slug)))
        .limit(1);
      if (clash && clash.id !== id) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    await this.db
      .update(notes)
      .set({
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
      })
      .where(eq(notes.id, id));

    return this.findByIdOrSlug(id);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(notes)
      .where(eq(notes.id, id))
      .returning({ id: notes.id });
    return deleted.length > 0;
  }

  async listAdmin() {
    const rows = await this.db.query.notes.findMany({
      with: { subject: true },
      orderBy: desc(notes.createdAt),
    });
    return Promise.all(rows.map((row) => this.format(row)));
  }

  private async format(row: any) {
    const [[likeCount], [commentCount]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(likes)
        .where(and(eq(likes.noteId, row.id), eq(likes.type, 'LIKE'))),
      this.db
        .select({ value: count() })
        .from(comments)
        .where(eq(comments.noteId, row.id)),
    ]);

    return {
      ...row,
      likeCount: likeCount?.value ?? 0,
      commentCount: commentCount?.value ?? 0,
    };
  }
}
