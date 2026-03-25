import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  findAll(): Observable<User[]> {
    return this.http.get<User[]>(this.api);
  }

  update(id: number, data: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}