import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ClientService, Client, CreateClientRequest } from './client.service';
import { PageResponse } from '../models/page-response.model';
import { environment } from '../../../environments/environment';

describe('ClientService', () => {
  let service: ClientService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/clients`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── Criação ───────────────────────────────────────────────────────────────

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  it('create deve fazer POST e retornar o cliente criado', () => {
    const request: CreateClientRequest = {
      name: 'Empresa ABC',
      email: 'contato@abc.com',
      phone: '11999999999',
      company: 'ABC Ltda',
      notes: 'Cliente premium',
      username: 'teste'
    };
    const mockResponse: Client = { id: 1, ...request };

    service.create(request).subscribe((client) => {
      expect(client.id).toBe(1);
      expect(client.name).toBe('Empresa ABC');
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  it('findAll deve fazer GET com parâmetros de paginação padrão', () => {
    const mockPage: PageResponse<Client> = {
      content: [{ id: 1, name: 'ABC', email: 'a@a.com', phone: '', company: '', notes: '' }],
      totalPages: 1,
      totalElements: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
    };

    service.findAll().subscribe((page) => {
      expect(page.content.length).toBe(1);
      expect(page.totalElements).toBe(1);
    });

    const req = httpMock.expectOne(`${apiUrl}?page=0&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('findAll deve usar os parâmetros de página e tamanho informados', () => {
    const mockPage: PageResponse<Client> = {
      content: [],
      totalPages: 3,
      totalElements: 25,
      number: 2,
      size: 5,
      first: false,
      last: false,
    };

    service.findAll(2, 5).subscribe((page) => {
      expect(page.number).toBe(2);
    });

    const req = httpMock.expectOne(`${apiUrl}?page=2&size=5`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  // ─── delete ─────────────────────────────────────────────────────────────────

  it('delete deve fazer DELETE para o endpoint correto', () => {
    service.delete(42).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/42`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('delete deve usar o ID correto na URL', () => {
    service.delete(99).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/99`);
    expect(req.request.url).toContain('/99');
    req.flush(null);
  });
});
