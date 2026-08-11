export interface SearchRepository {
  search(query: string): Promise<{
    blogs: any[];
    notes: any[];
    totalResults: number;
  }>;
}
