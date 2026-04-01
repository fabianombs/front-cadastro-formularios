export interface MenuItem {
  label: string;
  path: string;
  roles: string[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO', 'ROLE_CLIENT'],
  },
  {
    label: 'Usuários',
    path: '/users',
    roles: ['ROLE_ADMIN'],
  },
  {
    label: 'Clientes',
    path: '/clients',
    roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO'],
  },
  {
    label: 'Criar Formulário',
    path: '/form-builder',
    roles: ['ROLE_ADMIN'],
  },
  {
    label: 'Formulárioss',
    path: '/forms',
    roles: ['ROLE_ADMIN', 'ROLE_FUNCIONARIO', 'ROLE_CLIENT'],
  },
];
