import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page-response.model';
import { environment } from '../../../environments/environment';

/** Representa um cliente cadastrado na plataforma. */
export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

/** Payload enviado ao criar um novo cliente. */
export interface CreateClientRequest {
  name: string;
  username: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

/**
 * Serviço para operações CRUD sobre a entidade Cliente.
 *
 * Consome os endpoints REST do back-end sob `/api/clients`.
 * Todos os métodos retornam Observables que devem ser inscritos no componente.
 */
@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/clients`;

  /**
   * Cria um novo cliente.
   *
   * @param data - Dados do cliente a ser criado
   * @returns Observable que emite o cliente recém-criado com `id` gerado pelo servidor
   */
  create(data: CreateClientRequest): Observable<Client> {
    return this.http.post<Client>(this.api, data);
  }

  /**
   * Recupera uma página de clientes paginada.
   * Utiliza paginação do Spring (page 0-based).
   *
   * @param page - Número da página (começa em 0, padrão: 0)
   * @param size - Quantidade de registros por página (padrão: 10)
   * @returns Observable com `PageResponse<Client>` contendo conteúdo e metadados de paginação
   */
  findAll(page = 0, size = 10): Observable<PageResponse<Client>> {
    return this.http.get<PageResponse<Client>>(`${this.api}?page=${page}&size=${size}`);
  }

  /**
   * Remove um cliente pelo seu identificador.
   *
   * @param id - ID do cliente a ser removido
   * @returns Observable de void (sem corpo de resposta)
   */
  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
