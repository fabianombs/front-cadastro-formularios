import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: Partial<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      login: vi.fn(),
      setSession: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([{ path: '**', component: class {} }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  // ─── Formulário ──────────────────────────────────────────────────────────────

  it('deve iniciar com formulário inválido', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('deve ter campos username e password', () => {
    expect(component.form.get('username')).toBeTruthy();
    expect(component.form.get('password')).toBeTruthy();
  });

  it('username deve ser obrigatório', () => {
    const control = component.form.get('username')!;
    control.setValue('');
    expect(control.hasError('required')).toBe(true);
  });

  it('password deve ser obrigatório', () => {
    const control = component.form.get('password')!;
    control.setValue('');
    expect(control.hasError('required')).toBe(true);
  });

  it('formulário deve ser válido com username e password preenchidos', () => {
    component.form.setValue({ username: 'admin', password: '123456' });
    expect(component.form.valid).toBe(true);
  });

  // ─── Estado inicial ──────────────────────────────────────────────────────────

  it('deve iniciar com loading false', () => {
    expect(component.loading()).toBe(false);
  });

  it('deve iniciar sem mensagem de erro', () => {
    expect(component.error()).toBeNull();
  });

  // ─── submit — form inválido ──────────────────────────────────────────────────

  it('não deve chamar auth.login quando formulário é inválido', () => {
    component.submit();
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  // ─── submit — sucesso (of() é síncrono) ─────────────────────────────────────

  it('deve chamar login, setSession e navegar para / no sucesso', () => {
    (authServiceMock.login as ReturnType<typeof vi.fn>).mockReturnValue(of({ token: 'jwt-token' }));

    component.form.setValue({ username: 'admin', password: '123456' });
    component.submit();

    expect(authServiceMock.login).toHaveBeenCalledWith({ username: 'admin', password: '123456' });
    expect(authServiceMock.setSession).toHaveBeenCalledWith('jwt-token');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  // ─── submit — erro ───────────────────────────────────────────────────────────

  it('deve exibir mensagem de erro quando login falha', () => {
    (authServiceMock.login as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => ({ status: 401 })),
    );

    component.form.setValue({ username: 'admin', password: 'errada' });
    component.submit();

    expect(component.error()).toBe('Credenciais inválidas');
    expect(component.loading()).toBe(false);
  });

  it('não deve navegar em caso de erro no login', () => {
    (authServiceMock.login as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new Error('Unauthorized')),
    );

    component.form.setValue({ username: 'user', password: 'wrong' });
    component.submit();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deve definir loading=false em caso de erro', () => {
    (authServiceMock.login as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new Error('401')),
    );

    component.form.setValue({ username: 'admin', password: 'errada' });
    component.submit();

    expect(component.loading()).toBe(false);
  });

  // ─── onMouseMove ─────────────────────────────────────────────────────────────

  it('onMouseMove deve atualizar variáveis CSS --x e --y', () => {
    const event = { clientX: 100, clientY: 200 } as MouseEvent;
    component.onMouseMove(event);

    expect(document.documentElement.style.getPropertyValue('--x')).toBe('100px');
    expect(document.documentElement.style.getPropertyValue('--y')).toBe('200px');
  });
});
