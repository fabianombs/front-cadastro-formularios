import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * Guard funcional que protege rotas autenticadas e com controle de acesso por papel (RBAC).
 *
 * Comportamento:
 * 1. Se não há usuário autenticado → redireciona para `/login` e bloqueia o acesso.
 * 2. Se a rota define `data.roles` e o papel do usuário não está na lista → redireciona
 *    para `/` (home) e bloqueia o acesso.
 * 3. Caso contrário → permite o acesso.
 *
 * Configuração nas rotas:
 * ```ts
 * {
 *   path: 'users',
 *   canActivate: [authGuard],
 *   data: { roles: ['ROLE_ADMIN'] },
 *   loadComponent: () => import('./users.component')
 * }
 * ```
 */
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.user();

  // Usuário não autenticado — redireciona para login
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // Verifica restrição de papel (role) definida na rota
  const roles = route.data?.['roles'] as string[];

  if (roles && !roles.includes(user.role)) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
