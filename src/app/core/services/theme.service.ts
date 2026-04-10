import { Injectable, signal, computed, effect } from '@angular/core';

/** Temas disponíveis na aplicação. */
export type Theme = 'dark' | 'light';

/**
 * Serviço de gerenciamento de tema visual da aplicação.
 *
 * Responsabilidades:
 * - Persistir a preferência de tema no `localStorage`
 * - Aplicar o atributo `data-theme` no elemento `<html>` para estilização CSS
 * - Respeitar a preferência do sistema operacional (`prefers-color-scheme`) como fallback
 * - Expor o estado do tema via Signals reativos
 *
 * O CSS deve usar `[data-theme="dark"]` e `[data-theme="light"]` para alternância de estilos.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'ff-theme';

  /** Signal interno que armazena o tema ativo. */
  private _theme = signal<Theme>(this.resolveInitialTheme());

  /** Tema atual — `'dark'` ou `'light'`. */
  theme = computed(() => this._theme());

  /** `true` quando o tema escuro está ativo. Útil para condicionais de template. */
  isDark = computed(() => this._theme() === 'dark');

  constructor() {
    // Sincroniza o atributo HTML e localStorage sempre que o tema mudar
    effect(() => {
      const t = this._theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(this.STORAGE_KEY, t);
    });
  }

  /**
   * Alterna entre os temas claro e escuro.
   * Se o tema atual for `'dark'`, muda para `'light'` e vice-versa.
   */
  toggle() {
    this._theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  /**
   * Define o tema explicitamente.
   *
   * @param theme - `'dark'` ou `'light'`
   */
  setTheme(theme: Theme) {
    this._theme.set(theme);
  }

  /**
   * Resolve o tema inicial na seguinte ordem de prioridade:
   * 1. Valor armazenado no `localStorage`
   * 2. Preferência do sistema operacional (`prefers-color-scheme`)
   * 3. Fallback para `'light'`
   */
  private resolveInitialTheme(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
