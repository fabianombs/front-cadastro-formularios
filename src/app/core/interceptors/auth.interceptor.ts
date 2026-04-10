import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

/**
 * Interceptor HTTP funcional responsável por:
 *
 * 1. **Injeção do token JWT**: Adiciona o header `Authorization: Bearer <token>`
 *    em todas as requisições quando o usuário está autenticado.
 *
 * 2. **Tratamento de 401 (Unauthorized)**: Quando o servidor retorna 401,
 *    realiza o logout automático (remove o token e redireciona para `/login`).
 *    Isso garante que sessões expiradas sejam encerradas graciosamente.
 *
 * Registrado globalmente em `app.config.ts` via `withInterceptors([authInterceptor])`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();

  // Clona a requisição adicionando o header Authorization apenas se houver token
  const newReq = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : req;

  return next(newReq).pipe(
    catchError((err) => {
      // Sessão expirada ou token inválido — encerra a sessão e redireciona
      if (err.status === 401) {
        auth.logout();
        router.navigate(['/login']);
      }

      return throwError(() => err);
    }),
  );
};
