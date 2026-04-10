import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../models/jwt.model';

describe('authGuard', () => {
  // Usa `any` para evitar conflito de tipo entre Signal e vi.fn
  let authServiceMock: any;
  let router: Router;

  function runGuard(routeData: Record<string, unknown> = {}): boolean | unknown {
    const route = { data: routeData } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(route, state));
  }

  function setupWithUser(user: JwtPayload | null) {
    authServiceMock = { user: signal(user) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([{ path: '**', component: class {} }]),
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  // ─── Usuário não autenticado ─────────────────────────────────────────────────

  it('deve retornar false e redirecionar para /login quando não autenticado', () => {
    setupWithUser(null);

    const result = runGuard();

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  // ─── Usuário autenticado sem restrição de role ───────────────────────────────

  it('deve retornar true quando autenticado e rota não tem roles definidas', () => {
    setupWithUser(buildUser('ROLE_ADMIN'));

    const result = runGuard();

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // ─── Restrição de role ───────────────────────────────────────────────────────

  it('deve retornar true quando o role do usuário está na lista de roles permitidas', () => {
    setupWithUser(buildUser('ROLE_ADMIN'));

    const result = runGuard({ roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] });

    expect(result).toBe(true);
  });

  it('deve retornar true para ROLE_FUNCIONARIO quando está na lista', () => {
    setupWithUser(buildUser('ROLE_FUNCIONARIO'));

    const result = runGuard({ roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] });

    expect(result).toBe(true);
  });

  it('deve retornar false e redirecionar para / quando role não está na lista', () => {
    setupWithUser(buildUser('ROLE_CLIENT'));

    const result = runGuard({ roles: ['ROLE_ADMIN'] });

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('deve retornar false para ROLE_CLIENT tentando acessar rota de admin', () => {
    setupWithUser(buildUser('ROLE_CLIENT'));

    const result = runGuard({ roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] });

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUser(role: string): JwtPayload {
  return { sub: 'user', userId: 1, role, exp: 9999999999, iat: 0 };
}
