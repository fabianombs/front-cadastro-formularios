import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceMock: Partial<AuthService>;
  let router: Router;

  beforeEach(() => {
    authServiceMock = {
      getToken: vi.fn().mockReturnValue(null),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: class {} }]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  // ─── Sem token ──────────────────────────────────────────────────────────────

  it('não deve adicionar header Authorization quando não há token', () => {
    (authServiceMock.getToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  // ─── Com token ──────────────────────────────────────────────────────────────

  it('deve adicionar header Authorization com Bearer token', () => {
    (authServiceMock.getToken as ReturnType<typeof vi.fn>).mockReturnValue('meu-jwt-token');

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer meu-jwt-token');
    req.flush({});
  });

  it('deve incluir o token correto no header', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
    (authServiceMock.getToken as ReturnType<typeof vi.fn>).mockReturnValue(token);

    httpClient.post('/api/data', {}).subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
  });

  // ─── Tratamento de 401 ──────────────────────────────────────────────────────

  it('deve chamar logout e redirecionar para /login em resposta 401', () => {
    (authServiceMock.getToken as ReturnType<typeof vi.fn>).mockReturnValue('token');

    httpClient.get('/api/protegido').subscribe({
      error: () => {}, // Absorve o erro para não quebrar o teste
    });

    const req = httpMock.expectOne('/api/protegido');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('deve propagar o erro após o logout no 401', () => {
    (authServiceMock.getToken as ReturnType<typeof vi.fn>).mockReturnValue('token');

    let errorReceived = false;
    httpClient.get('/api/protegido').subscribe({
      error: () => { errorReceived = true; },
    });

    const req = httpMock.expectOne('/api/protegido');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBe(true);
  });

  it('não deve chamar logout para erros 500', () => {
    (authServiceMock.getToken as ReturnType<typeof vi.fn>).mockReturnValue('token');

    httpClient.get('/api/recurso').subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/recurso');
    req.flush({}, { status: 500, statusText: 'Internal Server Error' });

    expect(authServiceMock.logout).not.toHaveBeenCalled();
  });

  it('não deve chamar logout para erros 403', () => {
    (authServiceMock.getToken as ReturnType<typeof vi.fn>).mockReturnValue('token');

    httpClient.get('/api/admin').subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/admin');
    req.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(authServiceMock.logout).not.toHaveBeenCalled();
  });
});
