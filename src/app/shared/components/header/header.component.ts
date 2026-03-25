import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MENU_ITEMS } from './header.config';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html'
})
export class HeaderComponent {

  auth = inject(AuthService);

  user = this.auth.user;

  menu = MENU_ITEMS;

  // 🔥 FILTRA MENU DINAMICAMENTE
  filteredMenu = computed(() => {
    const role = this.user()?.role;

    if (!role) return []; // 👈 resolve o problema

    return this.menu.filter(item => item.roles.includes(role));
  });

  logout() {
    this.auth.logout();
  }
}