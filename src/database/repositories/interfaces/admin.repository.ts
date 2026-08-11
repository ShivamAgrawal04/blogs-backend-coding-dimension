import type { UserRole } from '@/database/types';

export interface AdminUserListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AdminActor {
  id: string;
  email?: string | null;
}

export interface AdminRepository {
  getStats(): Promise<any>;
  getUsers(query: AdminUserListQuery): Promise<any>;
  changeRole(actor: AdminActor, userId: string, role: UserRole): Promise<any | null>;
  getAllBlogs(): Promise<{ blogs: any[] }>;
  deleteBlog(blogId: string): Promise<boolean>;
  getAllNotes(): Promise<any[]>;
}
