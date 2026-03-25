import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  // 🔓 ROTAS PÚBLICAS
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component')
      .then(m => m.RegisterComponent)
  },

  // 🔐 ROTAS PRIVADAS (COM LAYOUT)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),

    children: [

      // 🏠 DASHBOARD
      // {
      //   path: '',
      //   loadComponent: () => import('./features/dashboard/dashboard.component')
      //     .then(m => m.DashboardComponent)
      // },

      // 👤 USERS (ADMIN ONLY)
      {
        path: 'users',
        loadComponent: () => import('./features/users/users.component')
          .then(m => m.UsersComponent),
        canActivate: [authGuard],
        data: {
          roles: ['ROLE_ADMIN']
        }
      },

      // 👥 CLIENTS (FUNCIONARIO + ADMIN)
      // {
      //   path: 'clients',
      //   loadComponent: () => import('./features/clients/clients.component')
      //     .then(m => m.ClientsComponent),
      //   canActivate: [authGuard],
      //   data: {
      //     roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO']
      //   }
      // }

    ]
  },

  // ❌ FALLBACK
  {
    path: '**',
    redirectTo: ''
  }

];