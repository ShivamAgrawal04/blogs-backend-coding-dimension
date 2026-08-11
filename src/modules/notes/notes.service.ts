import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, or, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleDB } from '@/db/drizzle.module';
import { DRIZZLE } from '@/db/drizzle.token';
import { comments, likes, notes, subjects } from '@/db/schema';
import { CreateNoteDto } from '@/modules/notes/dto/create-note.dto';
import { UpdateNoteDto } from '@/modules/notes/dto/update-note.dto';

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
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findAll(query: { page?: number; limit?: number; subject?: string }) {
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
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
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

    const data = await Promise.all(rows.map((row) => this.format(row)));
    return {
      data,
      meta: {
        total: total[0]?.value ?? 0,
        page,
        limit,
        totalPages: Math.ceil((total[0]?.value ?? 0) / limit),
      },
    };
  }

  async findSubjects() {
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
    return rows.map((s) => ({
      ...s,
      notes: [...s.notes].sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }

  async createSubject(dto: {
    name: string;
    slug?: string;
    icon?: string;
    sortOrder?: number;
  }) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Name is required');

    let slug = slugify(dto.slug?.trim() || name);
    if (!slug) throw new BadRequestException('Invalid slug');

    const [taken] = await this.db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.slug, slug))
      .limit(1);
    if (taken) throw new BadRequestException('Subject slug already exists');

    const id = createId();
    const [created] = await this.db
      .insert(subjects)
      .values({
        id,
        name,
        slug,
        icon: dto.icon?.trim() || '📘',
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();
    return created;
  }

  async updateSubject(
    id: string,
    dto: { name?: string; slug?: string; icon?: string; sortOrder?: number },
  ) {
    const [existing] = await this.db
      .select()
      .from(subjects)
      .where(eq(subjects.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Subject not found');

    let slug = existing.slug;
    if (dto.slug !== undefined || dto.name !== undefined) {
      slug = slugify(dto.slug?.trim() || dto.name || existing.name);
      const [clash] = await this.db
        .select({ id: subjects.id })
        .from(subjects)
        .where(eq(subjects.slug, slug))
        .limit(1);
      if (clash && clash.id !== id) {
        throw new BadRequestException('Subject slug already exists');
      }
    }

    const [updated] = await this.db
      .update(subjects)
      .set({
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.icon !== undefined && { icon: dto.icon.trim() || '📘' }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        slug,
      })
      .where(eq(subjects.id, id))
      .returning();
    return updated;
  }

  async deleteSubject(id: string) {
    const [existing] = await this.db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Subject not found');

    const [noteCount] = await this.db
      .select({ value: count() })
      .from(notes)
      .where(eq(notes.subjectId, id));
    if ((noteCount?.value ?? 0) > 0) {
      throw new BadRequestException(
        'Delete or move notes in this subject before deleting it',
      );
    }

    await this.db.delete(subjects).where(eq(subjects.id, id));
    return { message: 'Subject deleted successfully' };
  }

  async findOne(idOrSlug: string) {
    const row = await this.db.query.notes.findFirst({
      where: or(eq(notes.id, idOrSlug), eq(notes.slug, idOrSlug)),
      with: { subject: true },
    });
    if (!row) throw new NotFoundException('Note not found');
    return this.format(row);
  }

  async create(_userId: string, dto: CreateNoteDto) {
    const [subject] = await this.db
      .select()
      .from(subjects)
      .where(eq(subjects.id, dto.subjectId))
      .limit(1);
    if (!subject) throw new BadRequestException('Invalid subject');

    let slug = slugify((dto as any).slug?.trim() || dto.title);
    if (!slug) throw new BadRequestException('Invalid slug');

    const [existing] = await this.db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.subjectId, dto.subjectId), eq(notes.slug, slug)))
      .limit(1);
    if (existing) slug = `${slug}-${Date.now()}`;

    const id = createId();
    await this.db.insert(notes).values({
      id,
      slug,
      title: dto.title,
      content: dto.content,
      description: dto.description || '',
      readTime: dto.readTime || '5 min read',
      subjectId: dto.subjectId,
      sortOrder: dto.sortOrder ?? 0,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
    });

    return this.findOne(id);
  }

  async update(id: string, dto: UpdateNoteDto) {
    const [existing] = await this.db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Note not found');

    let slug = existing.slug;
    if ((dto as any).slug || dto.title) {
      slug = slugify((dto as any).slug?.trim() || dto.title || existing.title);
      const [clash] = await this.db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.subjectId, existing.subjectId), eq(notes.slug, slug)))
        .limit(1);
      if (clash && clash.id !== id) slug = `${slug}-${Date.now()}`;
    }

    await this.db
      .update(notes)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.readTime !== undefined && { readTime: dto.readTime }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && {
          metaDescription: dto.metaDescription,
        }),
        slug,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, id));

    return this.findOne(id);
  }

  async delete(id: string) {
    const [existing] = await this.db.select({ id: notes.id }).from(notes).where(eq(notes.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Note not found');
    await this.db.delete(notes).where(eq(notes.id, id));
    return { message: 'Note deleted successfully' };
  }

  async findAllAdmin() {
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
      this.db.select({ value: count() }).from(comments).where(eq(comments.noteId, row.id)),
    ]);
    return {
      ...row,
      likeCount: likeCount?.value ?? 0,
      commentCount: commentCount?.value ?? 0,
    };
  }
}
