import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // 🔓 ROTAS PÚBLICAS
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },

  // 📄 FORMULÁRIOS DINÂMICOS PÚBLICOS
  {
    path: 'forms/:slug', // Preencher formulário via slug
    loadComponent: () =>
      import('./features/form-dynamic/form-dynamic.component').then((m) => m.FormDynamicComponent),
  },
  {
    path: 'forms/:slug/list',
    loadComponent: () =>
      import('./features/template-list/template-list.component').then(
        (m) => m.TemplateListComponent,
      ),
  },

  // 🔐 ROTAS PRIVADAS COM LAYOUT
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'users',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] },
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'clients',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] },
        loadComponent: () =>
          import('./features/cliente/cliente.component').then((m) => m.ClienteComponent),
      },
      {
        path: 'clients/new',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] },
        loadComponent: () =>
          import('./features/cliente/create-client/create-client.component').then(
            (m) => m.CreateClientComponent,
          ),
      },
      {
        path: 'form-builder',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'] },
        loadComponent: () =>
          import('./features/create-form-template/create-form-template.component').then(
            (m) => m.CreateTemplateComponent,
          ),
      },

      {
        path: 'forms', // lista geral de formulários
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO', 'ROLE_CLIENT'] },
        loadComponent: () =>
          import('./features/template-list/template-list.component').then(
            (m) => m.TemplateListComponent,
          ),
      },
      {
        path: 'forms-all',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO', 'ROLE_CLIENT'] }, // apenas admin e cliente
        loadComponent: () =>
          import('./features/forms-all/forms-all.component').then((m) => m.FormsAllComponent),
      },
    ],
  },

  // ❌ FALLBACK
  { path: '**', redirectTo: '' },
];
