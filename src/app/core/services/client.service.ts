import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page-response.model';

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

export interface CreateClientRequest {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private http = inject(HttpClient);
  private api = 'http://localhost:8080/clients';

  create(data: CreateClientRequest): Observable<Client> {
    return this.http.post<Client>(this.api, data);
  }

  findAll(page = 0, size = 10): Observable<PageResponse<Client>> {
    return this.http.get<PageResponse<Client>>(`${this.api}?page=${page}&size=${size}`);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
