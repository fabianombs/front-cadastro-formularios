import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, of, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { FormTemplateService } from '../services/form-template.service';

/**
 * Guard exclusivo da rota `forms/:slug/list`.
 *
 * - Usuário autenticado: acesso normal (comportamento inalterado).
 * - Não autenticado: liberado SOMENTE quando o template é lista de presença
 *   com a opção pública ligada (hasAttendance && viewAllowAttendanceCheck),
 *   permitindo ao cliente preencher sem login. Qualquer outro caso → /login.
 *
 * Resultado: todos os demais templates continuam exigindo login, como antes.
 */
export const attendanceListPublicGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const templates = inject(FormTemplateService);

  // Autenticado: mantém o comportamento anterior (acesso liberado)
  if (auth.user()) return true;

  const slug = route.paramMap.get('slug');
  if (!slug) {
    router.navigate(['/login']);
    return false;
  }

  // Consulta pública (/form-templates/slug/** já é permitAll) para decidir o acesso
  return templates.getTemplateBySlug(slug).pipe(
    map((t) => {
      if (t.hasAttendance && t.viewAllowAttendanceCheck) return true;
      router.navigate(['/login']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    }),
  );
};
