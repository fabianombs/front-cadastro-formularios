import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

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

 // 🔹 Busca todos os clientes e extrai apenas o content
  findAll(page = 0, size = 10): Observable<Client[]> {
    return this.http.get<any>(`${this.api}?page=${page}&size=${size}`)
      .pipe(map(res => res.content)); // Extrai o array de clientes
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }
}