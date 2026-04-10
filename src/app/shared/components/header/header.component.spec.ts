import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const makeAuthMock = (role: string | null = null, sub: string | undefined = undefined) => ({
  role: signal(role),
  user: signal(sub ? { sub, name: 'Test', email: 'test@test.com' } : null),
  isAdmin: vi.fn().mockReturnValue(role === 'ROLE_ADMIN'),
  logout: vi.fn(),
});

const makeThemeMock = () => ({
  current: signal<'light' | 'dark'>('light'),
  isDark: signal(false),
  toggle: vi.fn(),
});

function createComponent(authMock: ReturnType<typeof makeAuthMock>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [HeaderComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: authMock },
      { provide: ThemeService, useValue: makeThemeMock() },
    ],
  });
  const fixture = TestBed.createComponent(HeaderComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, component };
}

describe('HeaderComponent', () => {
  // ─── menuItems ─────────────────────────────────────────────────────────────

  it('deve retornar lista vazia quando role é null', () => {
    const { component } = createComponent(makeAuthMock(null));
    expect(component.menuItems()).toEqual([]);
  });

  it('deve filtrar itens de menu para ROLE_ADMIN', () => {
    const { component } = createComponent(makeAuthMock('ROLE_ADMIN'));
    const labels = component.menuItems().map((i) => i.label);
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Usuários');
    expect(labels).toContain('Clientes');
    expect(labels).toContain('Forms de Clientes');
    expect(labels).not.toContain('Formulários');
  });

  it('deve filtrar itens de menu para ROLE_CLIENT', () => {
    const { component } = createComponent(makeAuthMock('ROLE_CLIENT', 'user123'));
    const labels = component.menuItems().map((i) => i.label);
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Formulários');
    expect(labels).not.toContain('Usuários');
    expect(labels).not.toContain('Clientes');
  });

  it('deve adicionar queryParams com sub do usuário para ROLE_CLIENT', () => {
    const { component } = createComponent(makeAuthMock('ROLE_CLIENT', 'user123'));
    const formItem = component.menuItems().find((i) => i.label === 'Formulários');
    expect(formItem?.queryParams).toEqual({ user: 'user123' });
  });

  it('deve filtrar itens de menu para ROLE_FUNCIONARIO', () => {
    const { component } = createComponent(makeAuthMock('ROLE_FUNCIONARIO'));
    const labels = component.menuItems().map((i) => i.label);
    expect(labels).toContain('Usuários');
    expect(labels).toContain('Clientes');
    expect(labels).not.toContain('Formulários');
  });

  // ─── menuOpen / toggleMenu / closeMenu ─────────────────────────────────────

  it('menuOpen começa como false', () => {
    const { component } = createComponent(makeAuthMock('ROLE_ADMIN'));
    expect(component.menuOpen()).toBe(false);
  });

  it('toggleMenu alterna menuOpen', () => {
    const { component } = createComponent(makeAuthMock('ROLE_ADMIN'));
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);
    component.toggleMenu();
    expect(component.menuOpen()).toBe(false);
  });

  it('closeMenu define menuOpen como false', () => {
    const { component } = createComponent(makeAuthMock('ROLE_ADMIN'));
    component.toggleMenu();
    component.closeMenu();
    expect(component.menuOpen()).toBe(false);
  });

  // ─── navigate ──────────────────────────────────────────────────────────────

  it('navigate chama router.navigateByUrl com o path informado', () => {
    const { component } = createComponent(makeAuthMock('ROLE_ADMIN'));
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.navigate('/dashboard');
    expect(navSpy).toHaveBeenCalledWith('/dashboard');
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  it('logout deve fechar o menu e chamar auth.logout()', () => {
    const authMock = makeAuthMock('ROLE_ADMIN');
    const { component } = createComponent(authMock);
    component.toggleMenu(); // abre
    component.logout();
    expect(component.menuOpen()).toBe(false);
    expect(authMock.logout).toHaveBeenCalled();
  });

  // ─── user computed ─────────────────────────────────────────────────────────

  it('user computed deve retornar null quando não há usuário logado', () => {
    const { component } = createComponent(makeAuthMock(null));
    expect(component.user()).toBeNull();
  });

  it('user computed deve retornar os dados do usuário logado', () => {
    const { component } = createComponent(makeAuthMock('ROLE_ADMIN', 'user123'));
    expect(component.user()?.sub).toBe('user123');
  });
});
