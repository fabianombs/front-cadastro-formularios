import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UserService, User, UpdateUserRequest } from './user.service';
import { PageResponse } from '../models/page-response.model';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/users`;

  const mockUser: User = {
    id: 1,
    name: 'Admin',
    email: 'admin@test.com',
    username: 'admin',
    role: 'ROLE_ADMIN',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  it('findAll deve fazer GET com paginação padrão', () => {
    const mockPage: PageResponse<User> = {
      content: [mockUser],
      totalPages: 1,
      totalElements: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
    };

    service.findAll().subscribe((page) => {
      expect(page.content).toHaveLength(1);
      expect(page.content[0].role).toBe('ROLE_ADMIN');
    });

    const req = httpMock.expectOne(`${apiUrl}?page=0&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('findAll deve aceitar parâmetros customizados de paginação', () => {
    const mockPage: PageResponse<User> = {
      content: [],
      totalPages: 5,
      totalElements: 47,
      number: 1,
      size: 5,
      first: false,
      last: false,
    };

    service.findAll(1, 5).subscribe();

    const req = httpMock.expectOne(`${apiUrl}?page=1&size=5`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  it('update deve fazer PUT para o endpoint correto', () => {
    const updateData: UpdateUserRequest = {
      name: 'Admin Atualizado',
      email: 'admin.novo@test.com',
      role: 'ROLE_FUNCIONARIO',
    };

    service.update(1, updateData).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateData);
    req.flush('');
  });

  it('update deve usar o ID correto na URL', () => {
    const updateData: UpdateUserRequest = { name: 'Novo', email: 'n@n.com', role: 'ROLE_CLIENT' };

    service.update(42, updateData).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/42`);
    expect(req.request.url).toContain('/42');
    req.flush('');
  });

  // ─── delete ─────────────────────────────────────────────────────────────────

  it('delete deve fazer DELETE para o endpoint correto', () => {
    service.delete(5).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush('');
  });

  it('delete deve usar o ID correto na URL', () => {
    service.delete(99).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/99`);
    expect(req.request.url).toContain('/99');
    req.flush('');
  });
});
