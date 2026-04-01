import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { JwtPayload } from '../models/jwt.model';
import { AuthResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // 🔥 Fonte da verdade
  private _token = signal<string | null>(localStorage.getItem('token'));

  // 🔥 Usuário decodificado
  user = computed<JwtPayload | null>(() => {
    const token = this._token();
    if (!token) return null;

    try {
      return this.decodeToken(token);
    } catch {
      return null;
    }
  });

  // 🔥 Auth state
  isAuthenticated = computed(() => !!this.user());

  // 🔥 ROLE (DERIVADO)
  role = computed(() => this.user()?.role ?? null);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private router: Router) { }

  // ==========================
  // 🔐 LOGIN
  // ==========================
  login(payload: { username: string; password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload);
  }

  // ==========================
  // 📝 REGISTER
  // ==========================
  register(payload: any) {
    return this.http.post(`${this.apiUrl}/register`, payload);
  }

  // ==========================
  // 🚪 LOGOUT
  // ==========================
  logout() {
    localStorage.removeItem('token');
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  // ==========================
  // 📌 SET SESSION
  // ==========================
  setSession(token: string) {
    localStorage.setItem('token', token);
    this._token.set(token);
  }

  getToken() {
    return this._token();
  }

  // ==========================
  // 🔐 ROLE HELPERS
  // ==========================
  isAdmin(): boolean {
    return this.role() === 'ROLE_ADMIN';
  }

  isFuncionario(): boolean {
    return this.role() === 'ROLE_FUNCIONARIO';
  }

  isClient(): boolean {
    return this.role() === 'ROLE_CLIENT';
  }

  hasRole(role: string): boolean {
    return this.role() === role;
  }

  canViewClients(): boolean {
    return this.isAdmin() || this.isFuncionario();
  }

  // ==========================
  // 🔍 Decode JWT (SAFE)
  // ==========================
  private decodeToken(token: string): JwtPayload {
    const payload = token.split('.')[1];

    // 🔥 Corrige base64url
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);

    return JSON.parse(decoded);
  }
}