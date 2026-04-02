import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface MenuItem {
  label: string;
  path: string;
  roles: string[];
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', path: '/', roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO', 'ROLE_CLIENT'] },
  { label: 'Usuários', path: '/users', roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] },
  { label: 'Clientes', path: '/clients', roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] },
  { label: 'Criar Formulário', path: '/form-builder', roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] },
  { label: 'Formulários', path: '/forms-all', roles: ['ROLE_CLIENT'] },
  { label: 'Forms de Clientes', path: '/forms-all', roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] },
];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  auth = inject(AuthService);
  router = inject(Router);

  // Computed menu filtrado pelo(s) role(s) do usuário
  menuItems = computed(() => {
    const role = this.auth.role();
    if (!role) return [];

    return MENU_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
      if (role === 'ROLE_CLIENT' && item.label === 'Formulários') {
        // Em vez de mudar path para string com ?, usamos queryParams
        return { ...item, path: '/forms-all', queryParams: { user: this.auth.user()?.sub } };
      }
      return { ...item, queryParams: {} };
    });
  });

  // Computed para usuário
  user = computed(() => this.auth.user());

  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  navigate(path: string) {
    this.router.navigateByUrl(path);
  }

  logout() {
    this.closeMenu();
    this.auth.logout();
  }
}
