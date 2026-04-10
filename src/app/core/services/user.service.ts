import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page-response.model';
import { environment } from '../../../environments/environment';

/** Representa um usuário do sistema com seus dados e papel de acesso. */
export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
}

/** Payload enviado ao atualizar os dados de um usuário. */
export interface UpdateUserRequest {
  name: string;
  email: string;
  role: string;
}

/**
 * Serviço para gerenciamento de usuários da plataforma.
 *
 * Consome os endpoints REST do back-end sob `/api/users`.
 * Disponível apenas para usuários com papel `ROLE_ADMIN`.
 *
 * Operações disponíveis:
 * - Listar usuários com paginação
 * - Atualizar dados e papel de um usuário
 * - Excluir um usuário
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/users`;

  /**
   * Recupera a lista paginada de usuários cadastrados.
   *
   * @param page - Número da página (0-based, padrão: 0)
   * @param size - Quantidade de registros por página (padrão: 10)
   * @returns Observable com `PageResponse<User>`
   */
  findAll(page = 0, size = 10): Observable<PageResponse<User>> {
    return this.http.get<PageResponse<User>>(`${this.api}?page=${page}&size=${size}`);
  }

  /**
   * Atualiza os dados de um usuário existente.
   * O back-end retorna texto simples, por isso o `responseType` é forçado.
   *
   * @param id - ID do usuário a ser atualizado
   * @param data - Novos dados do usuário (name, email, role)
   * @returns Observable de void
   */
  update(id: number, data: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}`, data, { responseType: 'text' as 'json' });
  }

  /**
   * Remove um usuário pelo seu identificador.
   * O back-end retorna texto simples, por isso o `responseType` é forçado.
   *
   * @param id - ID do usuário a ser removido
   * @returns Observable de void
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`, { responseType: 'text' as 'json' });
  }
}
