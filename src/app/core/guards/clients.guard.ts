import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional que protege rotas exclusivas para visualização de clientes.
 *
 * Permite o acesso apenas a usuários com papel `ROLE_ADMIN` ou `ROLE_FUNCIONARIO`.
 * Usuários com papel `ROLE_CLIENT` são redirecionados para a home (`/`).
 *
 * Utiliza `AuthService.canViewClients()` como critério de verificação.
 */
export const clientsGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.canViewClients()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
