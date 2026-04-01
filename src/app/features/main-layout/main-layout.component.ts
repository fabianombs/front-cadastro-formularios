import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  standalone: true,
  imports: [HeaderComponent, RouterOutlet, FooterComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  auth = inject(AuthService);

  user = this.auth.user;

  logout() {
    this.auth.logout();
  }

  // 🔥 ROLE HELPERS (clean e reutilizável)
  isAdmin() {
    return this.user()?.role === 'ROLE_ADMIN';
  }

  isFuncionario() {
    return this.user()?.role === 'ROLE_FUNCIONARIO';
  }

  isClient() {
    return this.user()?.role === 'ROLE_CLIENT';
  }
}
