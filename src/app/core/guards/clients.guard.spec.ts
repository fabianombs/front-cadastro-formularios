import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideRouter, Router } from '@angular/router';
import { clientsGuard } from './clients.guard';
import { AuthService } from '../services/auth.service';

describe('clientsGuard', () => {
  let authServiceMock: Partial<AuthService>;
  let router: Router;

  function runGuard(): boolean | unknown {
    const route = {} as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => clientsGuard(route, state));
  }

  beforeEach(() => {
    authServiceMock = {
      canViewClients: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([{ path: '**', component: class {} }]),
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('deve retornar true quando canViewClients() é true (ADMIN)', () => {
    (authServiceMock.canViewClients as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const result = runGuard();

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deve retornar true quando canViewClients() é true (FUNCIONARIO)', () => {
    (authServiceMock.canViewClients as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const result = runGuard();

    expect(result).toBe(true);
  });

  it('deve retornar false e redirecionar para / quando canViewClients() é false', () => {
    (authServiceMock.canViewClients as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const result = runGuard();

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('deve redirecionar para / quando usuário é CLIENT', () => {
    (authServiceMock.canViewClients as ReturnType<typeof vi.fn>).mockReturnValue(false);

    runGuard();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
