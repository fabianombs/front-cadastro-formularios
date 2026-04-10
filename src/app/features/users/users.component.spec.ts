import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { UsersComponent } from './users.component';
import { UserService, User } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

const mockUsers: User[] = [
  { id: 1, username: 'joao', name: 'João', email: 'joao@email.com', role: 'ROLE_ADMIN' },
  { id: 2, username: 'maria', name: 'Maria', email: 'maria@email.com', role: 'ROLE_FUNCIONARIO' },
  { id: 3, username: 'pedro', name: 'Pedro', email: 'pedro@email.com', role: 'ROLE_CLIENT' },
];

const pageResponse = (users: User[], totalPages = 1, totalElements = 3) => ({
  content: users,
  totalPages,
  totalElements,
  size: 10,
  number: 0,
});

function createSuite(adminRole = true) {
  const userServiceMock = {
    findAll: vi.fn().mockReturnValue(of(pageResponse(mockUsers))),
    update: vi.fn().mockReturnValue(of({})),
    delete: vi.fn().mockReturnValue(of({})),
  };
  const authServiceMock = {
    user: signal(null),
    role: signal('ROLE_ADMIN'),
    isAdmin: vi.fn().mockReturnValue(adminRole),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [UsersComponent],
    providers: [
      provideRouter([]),
      importProvidersFrom(BrowserAnimationsModule, ToastrModule.forRoot()),
      { provide: UserService, useValue: userServiceMock },
      { provide: AuthService, useValue: authServiceMock },
    ],
  });

  const fixture = TestBed.createComponent(UsersComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, component, userServiceMock, authServiceMock };
}

describe('UsersComponent', () => {
  it('deve ser criado', () => {
    const { component } = createSuite();
    expect(component).toBeTruthy();
  });

  // ─── loadUsers ─────────────────────────────────────────────────────────────

  it('loadUsers deve popular users, totalPages e totalElements', () => {
    const { component, userServiceMock } = createSuite();
    userServiceMock.findAll.mockReturnValue(of(pageResponse(mockUsers, 2, 3)));
    component.loadUsers();
    expect(component.users()).toHaveLength(3);
    expect(component.totalPages()).toBe(2);
    expect(component.totalElements()).toBe(3);
    expect(component.loading()).toBe(false);
  });

  it('loadUsers deve definir loading como false após erro', () => {
    const { component, userServiceMock } = createSuite();
    userServiceMock.findAll.mockReturnValue(throwError(() => new Error('err')));
    component.loadUsers();
    expect(component.loading()).toBe(false);
  });

  // ─── filteredUsers ─────────────────────────────────────────────────────────

  it('filteredUsers deve retornar todos os usuários sem filtros', () => {
    const { component } = createSuite();
    expect(component.filteredUsers()).toHaveLength(3);
  });

  it('filteredUsers deve filtrar por texto de busca no username', () => {
    const { component } = createSuite();
    component.search.set('joao');
    expect(component.filteredUsers()).toHaveLength(1);
    expect(component.filteredUsers()[0].username).toBe('joao');
  });

  it('filteredUsers deve filtrar por texto de busca no name', () => {
    const { component } = createSuite();
    component.search.set('maria');
    expect(component.filteredUsers()[0].name).toBe('Maria');
  });

  it('filteredUsers deve filtrar por role', () => {
    const { component } = createSuite();
    component.roleFilter.set('ROLE_CLIENT');
    expect(component.filteredUsers()).toHaveLength(1);
    expect(component.filteredUsers()[0].username).toBe('pedro');
  });

  it('filteredUsers deve combinar busca e filtro de role', () => {
    const { component } = createSuite();
    component.search.set('maria');
    component.roleFilter.set('ROLE_ADMIN');
    expect(component.filteredUsers()).toHaveLength(0);
  });

  // ─── nextPage / prevPage ───────────────────────────────────────────────────

  it('nextPage deve incrementar page e recarregar quando há próxima página', () => {
    const { component, userServiceMock } = createSuite();
    userServiceMock.findAll.mockReturnValue(of(pageResponse(mockUsers, 3, 30)));
    component.loadUsers();
    const callsBefore = userServiceMock.findAll.mock.calls.length;
    component.nextPage();
    expect(component.page()).toBe(1);
    expect(userServiceMock.findAll.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('nextPage não deve incrementar quando está na última página', () => {
    const { component } = createSuite();
    // totalPages = 1, page = 0 → última página
    component.nextPage();
    expect(component.page()).toBe(0);
  });

  it('prevPage deve decrementar page e recarregar quando não está na primeira', () => {
    const { component, userServiceMock } = createSuite();
    userServiceMock.findAll.mockReturnValue(of(pageResponse(mockUsers, 3, 30)));
    component.loadUsers();
    component.nextPage();
    const callsBefore = userServiceMock.findAll.mock.calls.length;
    component.prevPage();
    expect(component.page()).toBe(0);
    expect(userServiceMock.findAll.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('prevPage não deve decrementar quando está na primeira página', () => {
    const { component } = createSuite();
    component.prevPage();
    expect(component.page()).toBe(0);
  });

  // ─── isAdmin ───────────────────────────────────────────────────────────────

  it('isAdmin deve retornar true para administrador', () => {
    const { component } = createSuite(true);
    expect(component.isAdmin()).toBe(true);
  });

  it('isAdmin deve retornar false para não administrador', () => {
    const { component } = createSuite(false);
    expect(component.isAdmin()).toBe(false);
  });

  // ─── startEdit / cancelEdit ────────────────────────────────────────────────

  it('startEdit deve definir editingUserId e copiar dados do usuário', () => {
    const { component } = createSuite();
    component.startEdit(mockUsers[0]);
    expect(component.editingUserId()).toBe(1);
    expect(component.editedUser().name).toBe('João');
  });

  it('cancelEdit deve limpar editingUserId', () => {
    const { component } = createSuite();
    component.startEdit(mockUsers[0]);
    component.cancelEdit();
    expect(component.editingUserId()).toBeNull();
  });

  // ─── saveEdit ──────────────────────────────────────────────────────────────

  it('saveEdit deve chamar userService.update e recarregar', () => {
    const { component, userServiceMock } = createSuite();
    component.startEdit(mockUsers[0]);
    component.editedUser.set({ name: 'João Editado', email: 'j@email.com', role: 'ROLE_ADMIN' });
    component.saveEdit(1);
    expect(userServiceMock.update).toHaveBeenCalledWith(1, {
      name: 'João Editado',
      email: 'j@email.com',
      role: 'ROLE_ADMIN',
    });
    expect(component.editingUserId()).toBeNull();
  });

  // ─── deleteUser ────────────────────────────────────────────────────────────

  it('deleteUser deve chamar userService.delete e recarregar quando confirmado', () => {
    const { component, userServiceMock } = createSuite();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteUser(1);
    expect(userServiceMock.delete).toHaveBeenCalledWith(1);
    vi.restoreAllMocks();
  });

  it('deleteUser não deve chamar delete quando cancelado', () => {
    const { component, userServiceMock } = createSuite();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.deleteUser(1);
    expect(userServiceMock.delete).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
