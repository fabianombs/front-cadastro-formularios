import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { JwtPayload } from '../models/jwt.model';
import { AuthResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';

/**
 * Serviço responsável por toda a camada de autenticação da aplicação.
 *
 * Responsabilidades:
 * - Gerenciar o token JWT no `localStorage`
 * - Expor o estado de autenticação via Signals reativos
 * - Fornecer helpers de verificação de papel (role)
 * - Realizar login, registro e logout
 *
 * O estado é mantido em um Signal privado `_token` e todos os dados derivados
 * (usuário, role, isAuthenticated) são `computed`, garantindo reatividade automática.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Fonte primária de verdade do token JWT.
   * Inicializada a partir do `localStorage` para persistir sessões entre reloads.
   */
  private _token = signal<string | null>(localStorage.getItem('token'));

  /**
   * Payload decodificado do JWT atual.
   * Retorna `null` quando não há token ou quando o token é inválido.
   */
  user = computed<JwtPayload | null>(() => {
    const token = this._token();
    if (!token) return null;

    try {
      return this.decodeToken(token);
    } catch {
      return null;
    }
  });

  /**
   * Indica se há um usuário autenticado com token válido.
   * Derivado de `user()` — atualiza automaticamente quando o token muda.
   */
  isAuthenticated = computed(() => !!this.user());

  /**
   * Papel (role) do usuário autenticado.
   * Exemplos: `'ROLE_ADMIN'`, `'ROLE_FUNCIONARIO'`, `'ROLE_CLIENT'`.
   * Retorna `null` quando não há sessão ativa.
   */
  role = computed(() => this.user()?.role ?? null);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // ==========================
  // Autenticação
  // ==========================

  /**
   * Envia as credenciais ao back-end e retorna o Observable com o token JWT.
   * O chamador é responsável por armazenar o token via `setSession()`.
   *
   * @param payload - Objeto com `username` e `password`
   * @returns Observable que emite `AuthResponse` contendo o token JWT
   */
  login(payload: { username: string; password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload);
  }

  /**
   * Registra um novo usuário na plataforma.
   * Após o registro, o usuário deve realizar login para obter um token.
   *
   * @param payload - Dados do novo usuário (name, email, username, password)
   * @returns Observable de confirmação do back-end
   */
  register(payload: { name: string; email: string; username: string; password: string }) {
    return this.http.post(`${this.apiUrl}/register`, payload);
  }

  /**
   * Encerra a sessão do usuário:
   * - Remove o token do `localStorage`
   * - Reseta o Signal `_token` para `null`
   * - Redireciona para `/login`
   */
  logout() {
    localStorage.removeItem('token');
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  /**
   * Persiste o token JWT após login bem-sucedido.
   * Atualiza o Signal `_token`, o que propaga automaticamente para
   * `user`, `role` e `isAuthenticated`.
   *
   * @param token - Token JWT recebido do back-end
   */
  setSession(token: string) {
    localStorage.setItem('token', token);
    this._token.set(token);
  }

  /**
   * Retorna o token JWT atual (pode ser `null` se não autenticado).
   * Usado principalmente pelo interceptor HTTP para montar o header `Authorization`.
   */
  getToken() {
    return this._token();
  }

  // ==========================
  // Helpers de Role
  // ==========================

  /** Retorna `true` quando o usuário possui o papel de administrador. */
  isAdmin(): boolean {
    return this.role() === 'ROLE_ADMIN';
  }

  /** Retorna `true` quando o usuário possui o papel de funcionário. */
  isFuncionario(): boolean {
    return this.role() === 'ROLE_FUNCIONARIO';
  }

  /** Retorna `true` quando o usuário possui o papel de cliente. */
  isClient(): boolean {
    return this.role() === 'ROLE_CLIENT';
  }

  /**
   * Verifica se o usuário possui um papel específico.
   *
   * @param role - String do papel a verificar (ex: `'ROLE_ADMIN'`)
   */
  hasRole(role: string): boolean {
    return this.role() === role;
  }

  /**
   * Atalho de verificação combinada para acesso à área de clientes.
   * Admins e funcionários têm permissão; clientes não.
   */
  canViewClients(): boolean {
    return this.isAdmin() || this.isFuncionario();
  }

  // ==========================
  // Internos
  // ==========================

  /**
   * Decodifica o payload de um token JWT (formato base64url → JSON).
   * Trata o padding ausente e a substituição de caracteres base64url (`-` e `_`).
   *
   * @param token - Token JWT completo no formato `header.payload.signature`
   * @returns Objeto `JwtPayload` com os campos do usuário
   * @throws SyntaxError se o payload não for JSON válido
   */
  private decodeToken(token: string): JwtPayload {
    const payload = token.split('.')[1];

    // Corrige base64url para base64 padrão
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);

    return JSON.parse(decoded);
  }
}
