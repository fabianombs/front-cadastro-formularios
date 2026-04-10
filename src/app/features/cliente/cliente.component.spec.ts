import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ClienteComponent } from './cliente.component';
import { ClientService, Client } from '../../core/services/client.service';
import { AuthService } from '../../core/services/auth.service';
import { MessageService } from '../../core/services/message.service';
import { PageResponse } from '../../core/models/page-response.model';

describe('ClienteComponent', () => {
  let component: ClienteComponent;
  let fixture: ComponentFixture<ClienteComponent>;
  let clientServiceMock: Partial<ClientService>;
  let authServiceMock: Partial<AuthService>;
  let messageServiceMock: Partial<MessageService>;
  let router: Router;

  const mockClients: Client[] = [
    { id: 1, name: 'Empresa A', email: 'a@a.com', phone: '11111', company: 'A Ltda', notes: '' },
    { id: 2, name: 'Empresa B', email: 'b@b.com', phone: '22222', company: 'B SA', notes: '' },
    { id: 3, name: 'Empresa C', email: 'c@c.com', phone: '33333', company: 'A Ltda', notes: '' },
  ];

  const mockPage: PageResponse<Client> = {
    content: mockClients,
    totalPages: 1,
    totalElements: 3,
    number: 0,
    size: 10,
    first: true,
    last: true,
  };

  beforeEach(async () => {
    clientServiceMock = {
      findAll: vi.fn().mockReturnValue(of(mockPage)),
      delete: vi.fn().mockReturnValue(of(null)),
    };

    authServiceMock = {
      isAdmin: vi.fn().mockReturnValue(true),
    };

    messageServiceMock = {
      success: vi.fn().mockReturnValue({}),
      error: vi.fn().mockReturnValue({}),
    };

    await TestBed.configureTestingModule({
      imports: [ClienteComponent],
      providers: [
        { provide: ClientService, useValue: clientServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        provideRouter([{ path: '**', component: class {} }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  // ─── Inicialização ───────────────────────────────────────────────────────────

  it('deve carregar clientes ao iniciar (ngOnInit)', () => {
    expect(clientServiceMock.findAll).toHaveBeenCalledWith(0, 10);
    expect(component.clients()).toHaveLength(3);
    expect(component.loading()).toBe(false);
  });

  it('deve definir totalPages e totalElements após carregar', () => {
    expect(component.totalPages()).toBe(1);
    expect(component.totalElements()).toBe(3);
  });

  // ─── Filtros ─────────────────────────────────────────────────────────────────

  it('filteredClients deve retornar todos os clientes sem filtros', () => {
    expect(component.filteredClients()).toHaveLength(3);
  });

  it('deve filtrar por nome na busca', () => {
    component.search.set('empresa a');
    expect(component.filteredClients()).toHaveLength(1);
    expect(component.filteredClients()[0].name).toBe('Empresa A');
  });

  it('deve filtrar por email na busca', () => {
    component.search.set('b@b.com');
    expect(component.filteredClients()).toHaveLength(1);
  });

  it('deve filtrar por empresa', () => {
    component.companyFilter.set('A Ltda');
    expect(component.filteredClients()).toHaveLength(2);
  });

  it('deve combinar filtro de empresa e busca', () => {
    component.companyFilter.set('A Ltda');
    component.search.set('empresa c');
    expect(component.filteredClients()).toHaveLength(1);
    expect(component.filteredClients()[0].name).toBe('Empresa C');
  });

  it('uniqueCompanies deve retornar empresas únicas', () => {
    expect(component.uniqueCompanies()).toContain('A Ltda');
    expect(component.uniqueCompanies()).toContain('B SA');
    expect(component.uniqueCompanies()).toHaveLength(2);
  });

  // ─── Paginação ───────────────────────────────────────────────────────────────

  it('nextPage deve avançar para a próxima página quando disponível', () => {
    component.totalPages.set(3);
    component.page.set(0);
    component.nextPage();

    expect(component.page()).toBe(1);
    expect(clientServiceMock.findAll).toHaveBeenCalledWith(1, 10);
  });

  it('nextPage não deve avançar quando estiver na última página', () => {
    component.page.set(0);
    component.totalPages.set(1);
    const callCount = (clientServiceMock.findAll as ReturnType<typeof vi.fn>).mock.calls.length;

    component.nextPage();

    expect((clientServiceMock.findAll as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
  });

  it('prevPage deve retroceder quando não estiver na primeira página', () => {
    component.page.set(2);
    component.totalPages.set(3);
    component.prevPage();

    expect(component.page()).toBe(1);
  });

  it('prevPage não deve retroceder quando estiver na primeira página', () => {
    component.page.set(0);
    const callCount = (clientServiceMock.findAll as ReturnType<typeof vi.fn>).mock.calls.length;

    component.prevPage();

    expect((clientServiceMock.findAll as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
  });

  // ─── Modal de exclusão ───────────────────────────────────────────────────────

  it('deleteClient deve abrir o modal com os dados corretos', () => {
    component.deleteClient(1, 'Empresa A');

    expect(component.deleteModalOpen()).toBe(true);
    expect(component.deleteTargetId()).toBe(1);
    expect(component.deleteTargetName()).toBe('Empresa A');
  });

  it('onDeleteCancelled deve fechar o modal e limpar o estado', () => {
    component.deleteClient(1, 'Empresa A');
    component.onDeleteCancelled();

    expect(component.deleteModalOpen()).toBe(false);
    expect(component.deleteTargetId()).toBeNull();
    expect(component.deleteTargetName()).toBe('');
  });

  it('onDeleteConfirmed não deve fazer nada quando deleteTargetId é null', () => {
    component.deleteTargetId.set(null);
    component.onDeleteConfirmed();
    expect(clientServiceMock.delete).not.toHaveBeenCalled();
  });

  // ─── Exclusão ────────────────────────────────────────────────────────────────

  it('onDeleteConfirmed deve excluir o cliente e exibir sucesso', () => {
    component.deleteClient(1, 'Empresa A');
    component.onDeleteConfirmed();

    expect(clientServiceMock.delete).toHaveBeenCalledWith(1);
    expect(messageServiceMock.success).toHaveBeenCalledWith('Cliente excluído com sucesso');
    expect(component.deleteModalOpen()).toBe(false);
  });

  it('onDeleteConfirmed deve exibir erro quando exclusão falha', () => {
    (clientServiceMock.delete as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new Error('Server Error')),
    );

    component.deleteClient(1, 'Empresa A');
    component.onDeleteConfirmed();

    expect(messageServiceMock.error).toHaveBeenCalledWith('Erro ao excluir cliente');
    expect(component.deleting()).toBe(false);
  });

  // ─── Navegação ───────────────────────────────────────────────────────────────

  it('goToCreate deve navegar para /clients/new', () => {
    component.goToCreate();
    expect(router.navigate).toHaveBeenCalledWith(['/clients/new']);
  });

  // ─── isAdmin ─────────────────────────────────────────────────────────────────

  it('isAdmin deve retornar o valor do AuthService', () => {
    expect(component.isAdmin()).toBe(true);

    (authServiceMock.isAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(component.isAdmin()).toBe(false);
  });

  // ─── Erro no carregamento ─────────────────────────────────────────────────────

  it('deve definir loading=false em caso de erro no carregamento', () => {
    (clientServiceMock.findAll as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    component.loadClients();

    expect(component.loading()).toBe(false);
  });
});
