import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NOTE_REPOSITORY } from '@/database/database.tokens';
import type {
  CreateNoteInput,
  CreateSubjectInput,
  NoteRepository,
  UpdateNoteInput,
  UpdateSubjectInput,
} from '@/database/repositories/interfaces/note.repository';
import { slugify } from '@/database/repositories/repository.helpers';
import { CreateNoteDto } from '@/modules/notes/dto/create-note.dto';
import { UpdateNoteDto } from '@/modules/notes/dto/update-note.dto';

@Injectable()
export class NoteService {
  constructor(
    @Inject(NOTE_REPOSITORY)
    private readonly noteRepository: NoteRepository,
  ) {}

  async findAll(query: { page?: number; limit?: number; subject?: string }) {
    return this.noteRepository.list(query);
  }

  async findSubjects() {
    return this.noteRepository.listSubjects();
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

    const taken = await this.noteRepository.findSubjectBySlug(slug);
    if (taken) throw new BadRequestException('Subject slug already exists');

    return this.noteRepository.createSubject({
      ...dto,
      name,
      slug,
    } as CreateSubjectInput);
  }

  async updateSubject(
    id: string,
    dto: { name?: string; slug?: string; icon?: string; sortOrder?: number },
  ) {
    const existing = await this.noteRepository.findSubjectById(id);
    if (!existing) throw new NotFoundException('Subject not found');

    let slug = existing.slug;
    if (dto.slug !== undefined || dto.name !== undefined) {
      slug = slugify(dto.slug?.trim() || dto.name || existing.name);
      const clash = await this.noteRepository.findSubjectBySlug(slug);
      if (clash && clash.id !== id) {
        throw new BadRequestException('Subject slug already exists');
      }
    }

    const updated = await this.noteRepository.updateSubject(id, {
      ...dto,
      slug,
    } as UpdateSubjectInput);
    if (!updated) throw new NotFoundException('Subject not found');
    return updated;
  }

  async deleteSubject(id: string) {
    const existing = await this.noteRepository.findSubjectById(id);
    if (!existing) throw new NotFoundException('Subject not found');

    const noteCount = await this.noteRepository.countBySubjectId(id);
    if (noteCount > 0) {
      throw new BadRequestException(
        'Delete or move notes in this subject before deleting it',
      );
    }

    await this.noteRepository.deleteSubject(id);
    return { message: 'Subject deleted successfully' };
  }

  async findOne(idOrSlug: string) {
    const row = await this.noteRepository.findByIdOrSlug(idOrSlug);
    if (!row) throw new NotFoundException('Note not found');
    return row;
  }

  async create(_userId: string, dto: CreateNoteDto) {
    const subject = await this.noteRepository.findSubjectById(dto.subjectId);
    if (!subject) throw new BadRequestException('Invalid subject');

    let slug = slugify((dto as any).slug?.trim() || dto.title);
    if (!slug) throw new BadRequestException('Invalid slug');

    return this.noteRepository.create(_userId, dto as CreateNoteInput);
  }

  async update(id: string, dto: UpdateNoteDto) {
    const existing = await this.noteRepository.findByIdOrSlug(id);
    if (!existing) throw new NotFoundException('Note not found');

    if (dto.subjectId !== undefined) {
      const subject = await this.noteRepository.findSubjectById(dto.subjectId);
      if (!subject) throw new BadRequestException('Invalid subject');
    }

    const updated = await this.noteRepository.update(id, dto as UpdateNoteInput);
    if (!updated) throw new NotFoundException('Note not found');
    return updated;
  }

  async delete(id: string) {
    const deleted = await this.noteRepository.delete(id);
    if (!deleted) throw new NotFoundException('Note not found');
    return { message: 'Note deleted successfully' };
  }

  async findAllAdmin() {
    return this.noteRepository.listAdmin();
  }
}
