import type { SubjectEntity } from '@/database/types';

export interface NoteListQuery {
  page?: number;
  limit?: number;
  subject?: string;
}

export interface CreateSubjectInput {
  name: string;
  slug?: string;
  icon?: string;
  sortOrder?: number;
}

export interface UpdateSubjectInput {
  name?: string;
  slug?: string;
  icon?: string;
  sortOrder?: number;
}

export interface CreateNoteInput {
  title: string;
  slug?: string;
  description?: string;
  content: string;
  readTime?: string;
  subjectId: string;
  sortOrder?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface UpdateNoteInput extends Partial<CreateNoteInput> {}

export interface NoteRepository {
  list(query: NoteListQuery): Promise<any>;
  listSubjects(): Promise<any[]>;
  findSubjectById(id: string): Promise<SubjectEntity | null>;
  findSubjectBySlug(slug: string): Promise<SubjectEntity | null>;
  countBySubjectId(subjectId: string): Promise<number>;
  createSubject(input: CreateSubjectInput): Promise<SubjectEntity>;
  updateSubject(id: string, input: UpdateSubjectInput): Promise<SubjectEntity | null>;
  deleteSubject(id: string): Promise<boolean>;
  findByIdOrSlug(idOrSlug: string): Promise<any | null>;
  create(userId: string, input: CreateNoteInput): Promise<any>;
  update(id: string, input: UpdateNoteInput): Promise<any | null>;
  delete(id: string): Promise<boolean>;
  listAdmin(): Promise<any[]>;
}
