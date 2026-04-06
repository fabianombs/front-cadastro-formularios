import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'ff-theme';

  private _theme = signal<Theme>(this.resolveInitialTheme());

  /** Tema atual */
  theme = computed(() => this._theme());

  /** True quando o tema ativo é dark */
  isDark = computed(() => this._theme() === 'dark');

  constructor() {
    // Aplica o atributo no <html> sempre que o tema mudar
    effect(() => {
      const t = this._theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(this.STORAGE_KEY, t);
    });
  }

  toggle() {
    this._theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  setTheme(theme: Theme) {
    this._theme.set(theme);
  }

  private resolveInitialTheme(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    // Fallback: respeita preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
