import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.user();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  const roles = route.data?.['roles'] as string[];

  if (roles && !roles.includes(user.role)) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
