import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceMock: Partial<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      register: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([{ path: '**', component: class {} }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  // ─── Formulário ──────────────────────────────────────────────────────────────

  it('deve ter os campos obrigatórios', () => {
    expect(component.form.get('name')).toBeTruthy();
    expect(component.form.get('email')).toBeTruthy();
    expect(component.form.get('username')).toBeTruthy();
    expect(component.form.get('password')).toBeTruthy();
    expect(component.form.get('confirmPassword')).toBeTruthy();
  });

  it('deve iniciar com formulário inválido', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('email deve ter validação de formato', () => {
    const emailControl = component.form.get('email')!;
    emailControl.setValue('invalido');
    expect(emailControl.hasError('email')).toBe(true);

    emailControl.setValue('valido@email.com');
    expect(emailControl.hasError('email')).toBe(false);
  });

  it('deve validar correspondência de senhas', () => {
    component.form.patchValue({
      name: 'Teste',
      email: 'teste@email.com',
      username: 'teste',
      password: '123456',
      confirmPassword: 'diferente',
    });
    expect(component.form.hasError('mismatch')).toBe(true);
  });

  it('formulário deve ser válido com todos os campos corretos', () => {
    component.form.setValue({
      name: 'João Silva',
      email: 'joao@email.com',
      username: 'joao',
      password: '123456',
      confirmPassword: '123456',
    });
    expect(component.form.valid).toBe(true);
  });

  // ─── Estado inicial ──────────────────────────────────────────────────────────

  it('deve iniciar com loading, success e error no estado padrão', () => {
    expect(component.loading()).toBe(false);
    expect(component.success()).toBe(false);
    expect(component.error()).toBeNull();
  });

  // ─── submit — form inválido ──────────────────────────────────────────────────

  it('não deve chamar register com formulário inválido', () => {
    component.submit();
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  // ─── submit — sucesso (of() é síncrono) ─────────────────────────────────────

  it('deve chamar register e navegar para /login no sucesso', () => {
    (authServiceMock.register as ReturnType<typeof vi.fn>).mockReturnValue(of({}));

    component.form.setValue({
      name: 'João',
      email: 'joao@email.com',
      username: 'joao',
      password: '123456',
      confirmPassword: '123456',
    });
    component.submit();

    expect(authServiceMock.register).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.loading()).toBe(false);
  });

  // ─── submit — erro ───────────────────────────────────────────────────────────

  it('deve exibir mensagem de erro quando registro falha', () => {
    (authServiceMock.register as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new Error('Conflict')),
    );

    component.form.setValue({
      name: 'João',
      email: 'joao@email.com',
      username: 'joao',
      password: '123456',
      confirmPassword: '123456',
    });
    component.submit();

    expect(component.error()).toBe('Erro ao cadastrar usuário');
    expect(component.loading()).toBe(false);
  });

  // ─── passwordMatchValidator ──────────────────────────────────────────────────

  it('passwordMatchValidator deve retornar null quando senhas coincidem', () => {
    const mockForm = {
      get: (field: string) => ({
        value: field === 'password' ? '123456' : '123456',
      }),
    } as any;
    expect(component.passwordMatchValidator(mockForm)).toBeNull();
  });

  it('passwordMatchValidator deve retornar { mismatch: true } quando senhas diferem', () => {
    const mockForm = {
      get: (field: string) => ({
        value: field === 'password' ? '123456' : 'diferente',
      }),
    } as any;
    expect(component.passwordMatchValidator(mockForm)).toEqual({ mismatch: true });
  });

  // ─── onMouseMove ─────────────────────────────────────────────────────────────

  it('onMouseMove deve atualizar variáveis CSS', () => {
    component.onMouseMove({ clientX: 50, clientY: 75 } as MouseEvent);
    expect(document.documentElement.style.getPropertyValue('--x')).toBe('50px');
    expect(document.documentElement.style.getPropertyValue('--y')).toBe('75px');
  });
});
