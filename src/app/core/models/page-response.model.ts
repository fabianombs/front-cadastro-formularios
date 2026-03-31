export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;   // página atual (0-based)
  size: number;
  first: boolean;
  last: boolean;
}
