import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { JwtPayload } from '../models/jwt.model';
import { AuthResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // 🔥 Estado base (fonte da verdade)
  private _token = signal<string | null>(localStorage.getItem('token'));

  // 🔥 Estado derivado (user decodificado)
  user = computed<JwtPayload | null>(() => {
    const token = this._token();
    if (!token) return null;

    try {
      return this.decodeToken(token);
    } catch {
      return null;
    }
  });

  // 🔥 Estado de autenticação
  isAuthenticated = computed(() => !!this.user());

  constructor(private http: HttpClient, private router: Router) {}

  // 🔐 LOGIN
  login(payload: { username: string; password: string }) {
    return this.http.post<AuthResponse>('http://localhost:8080/auth/login', payload);
  }

  // 📝 REGISTER
  register(payload: any) {
    return this.http.post('http://localhost:8080/auth/register', payload);
  }

  // 🚪 LOGOUT
  logout() {
    localStorage.removeItem('token');
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  // 📌 SET SESSION
  setSession(token: string) {
    localStorage.setItem('token', token);
    this._token.set(token);
  }

  getToken() {
    return this._token();
  }

  // 🔍 Decode JWT
  private decodeToken(token: string): JwtPayload {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  }
}