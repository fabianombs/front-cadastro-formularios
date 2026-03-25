import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

// Interface de menu
interface MenuItem {
  label: string;
  path: string;
  roles: string[];
}

// Itens do menu
const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', path: '/', roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO', 'ROLE_CLIENT'] },
  { label: 'Usuários', path: '/users', roles: ['ROLE_ADMIN'] },
  { label: 'Clientes', path: '/clients', roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] },
  { label: 'Criar Formulário', path: '/form-builder', roles: ['ROLE_ADMIN'] },
  { label: 'Formulários', path: '/forms', roles: ['ROLE_FUNCIONARIO', 'ROLE_CLIENT'] },
  { label: 'Forms de Clientes', path: '/forms-all', roles: ['ROLE_ADMIN'] } // 🔥 Novo

];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  auth = inject(AuthService);
  router = inject(Router);

  // Computed menu filtrado pelo role atual
  menuItems = computed(() => {
    const role = this.auth.role(); // signal do AuthService
    if (!role) return [];
    return MENU_ITEMS.filter(item => item.roles.includes(role));
  });

  // Expor usuário para o template
  user = computed(() => this.auth.user());

  // Navegação via Router
  navigate(path: string) {
    this.router.navigateByUrl(path);
  }

  // Logout
  logout() {
    this.auth.logout();
  }
}