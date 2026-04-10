import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

// Mock global de window.matchMedia — não disponível no ambiente de testes (jsdom)
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ThemeService', () => {
  let service: ThemeService;

  function createService() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    return TestBed.inject(ThemeService);
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    service = createService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  // ─── Resolução de tema inicial ───────────────────────────────────────────────

  it('deve usar tema armazenado no localStorage', () => {
    localStorage.setItem('ff-theme', 'dark');
    const svc = createService();
    expect(svc.theme()).toBe('dark');
  });

  it('deve usar "light" como fallback quando não há preferência armazenada', () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
    const svc = createService();
    expect(svc.theme()).toBe('light');
  });

  it('deve usar "dark" quando o sistema prefere dark mode e não há localStorage', () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    const svc = createService();
    expect(svc.theme()).toBe('dark');
  });

  // ─── toggle ─────────────────────────────────────────────────────────────────

  it('toggle deve alternar de light para dark', () => {
    service.setTheme('light');
    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
  });

  it('toggle deve alternar de dark para light', () => {
    service.setTheme('dark');
    service.toggle();
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
  });

  // ─── setTheme ───────────────────────────────────────────────────────────────

  it('setTheme("dark") deve definir tema escuro', () => {
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
  });

  it('setTheme("light") deve definir tema claro', () => {
    service.setTheme('light');
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
  });

  // ─── Persistência e DOM ─────────────────────────────────────────────────────

  it('deve persistir o tema no localStorage ao mudar', () => {
    service.setTheme('dark');
    TestBed.flushEffects();
    expect(localStorage.getItem('ff-theme')).toBe('dark');
  });

  it('deve aplicar data-theme no elemento html ao mudar', () => {
    service.setTheme('dark');
    TestBed.flushEffects();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  // ─── isDark computed ────────────────────────────────────────────────────────

  it('isDark deve ser false quando tema é light', () => {
    service.setTheme('light');
    expect(service.isDark()).toBe(false);
  });

  it('isDark deve ser true quando tema é dark', () => {
    service.setTheme('dark');
    expect(service.isDark()).toBe(true);
  });
});
