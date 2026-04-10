import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: class {} }, { path: '**', redirectTo: 'login' }]),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Evita erro de rota não encontrada durante o logout nos testes
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ─── Criação ───────────────────────────────────────────────────────────────

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  // ─── Estado inicial ─────────────────────────────────────────────────────────

  it('deve iniciar com token nulo quando localStorage está vazio', () => {
    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(service.role()).toBeNull();
  });

  it('deve recuperar token do localStorage ao iniciar', () => {
    const token = buildJwt({ sub: 'usuario', userId: 1, role: 'ROLE_ADMIN', exp: 9999999999, iat: 0 });
    localStorage.setItem('token', token);

    // Recria o serviço para simular reload da página
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const freshService = TestBed.inject(AuthService);

    expect(freshService.getToken()).toBe(token);
    expect(freshService.isAuthenticated()).toBe(true);
  });

  // ─── setSession ─────────────────────────────────────────────────────────────

  it('setSession deve armazenar o token e atualizar os Signals', () => {
    const token = buildJwt({ sub: 'admin', userId: 1, role: 'ROLE_ADMIN', exp: 9999999999, iat: 0 });

    service.setSession(token);

    expect(service.getToken()).toBe(token);
    expect(localStorage.getItem('token')).toBe(token);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.role()).toBe('ROLE_ADMIN');
    expect(service.user()?.sub).toBe('admin');
  });

  // ─── logout ─────────────────────────────────────────────────────────────────

  it('logout deve limpar o token e o localStorage', () => {
    const token = buildJwt({ sub: 'u', userId: 2, role: 'ROLE_CLIENT', exp: 9999999999, iat: 0 });
    service.setSession(token);

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  it('login deve fazer POST para o endpoint correto', () => {
    const payload = { username: 'admin', password: '123456' };
    const mockResponse = { token: 'jwt-token' };

    service.login(payload).subscribe((res) => {
      expect(res.token).toBe('jwt-token');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });

  // ─── register ───────────────────────────────────────────────────────────────

  it('register deve fazer POST para o endpoint de registro', () => {
    const payload = { name: 'Novo', email: 'novo@email.com', username: 'novo', password: '123' };

    service.register(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  // ─── Helpers de Role ────────────────────────────────────────────────────────

  it('isAdmin deve retornar true para ROLE_ADMIN', () => {
    setTokenWithRole(service, 'ROLE_ADMIN');
    expect(service.isAdmin()).toBe(true);
    expect(service.isFuncionario()).toBe(false);
    expect(service.isClient()).toBe(false);
  });

  it('isFuncionario deve retornar true para ROLE_FUNCIONARIO', () => {
    setTokenWithRole(service, 'ROLE_FUNCIONARIO');
    expect(service.isFuncionario()).toBe(true);
    expect(service.isAdmin()).toBe(false);
  });

  it('isClient deve retornar true para ROLE_CLIENT', () => {
    setTokenWithRole(service, 'ROLE_CLIENT');
    expect(service.isClient()).toBe(true);
    expect(service.isAdmin()).toBe(false);
  });

  it('hasRole deve verificar papel específico', () => {
    setTokenWithRole(service, 'ROLE_ADMIN');
    expect(service.hasRole('ROLE_ADMIN')).toBe(true);
    expect(service.hasRole('ROLE_CLIENT')).toBe(false);
  });

  it('canViewClients deve ser true para Admin e Funcionário', () => {
    setTokenWithRole(service, 'ROLE_ADMIN');
    expect(service.canViewClients()).toBe(true);

    setTokenWithRole(service, 'ROLE_FUNCIONARIO');
    expect(service.canViewClients()).toBe(true);
  });

  it('canViewClients deve ser false para CLIENT', () => {
    setTokenWithRole(service, 'ROLE_CLIENT');
    expect(service.canViewClients()).toBe(false);
  });

  it('canViewClients deve ser false quando não autenticado', () => {
    expect(service.canViewClients()).toBe(false);
  });

  // ─── Token inválido ─────────────────────────────────────────────────────────

  it('user deve retornar null para token malformado', () => {
    localStorage.setItem('token', 'token-invalido');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const svc = TestBed.inject(AuthService);

    expect(svc.user()).toBeNull();
    expect(svc.isAuthenticated()).toBe(false);
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function setTokenWithRole(service: AuthService, role: string): void {
  const token = buildJwt({ sub: 'user', userId: 1, role, exp: 9999999999, iat: 0 });
  service.setSession(token);
}
