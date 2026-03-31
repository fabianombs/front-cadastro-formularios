import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page-response.model';

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface UpdateUserRequest {
  username: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private http = inject(HttpClient);
  private api = 'http://localhost:8080/users';

  findAll(page = 0, size = 10): Observable<PageResponse<User>> {
    return this.http.get<PageResponse<User>>(`${this.api}?page=${page}&size=${size}`);
  }

  update(id: number, data: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
