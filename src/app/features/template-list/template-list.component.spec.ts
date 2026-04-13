import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CreateClientComponent } from '../cliente/create-client/create-client.component';
import { ClientService } from '../../core/services/client.service';
import { MessageService } from '../../core/services/message.service';

function createSuite() {
  const clientServiceMock = {
    create: vi.fn().mockReturnValue(of({})),
  };

  const messageMock = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  TestBed.resetTestingModule();

  TestBed.configureTestingModule({
    imports: [CreateClientComponent],
    providers: [
      provideRouter([{ path: 'clients', redirectTo: '' }]),
      { provide: ClientService, useValue: clientServiceMock },
      { provide: MessageService, useValue: messageMock },
      { provide: ToastrService, useValue: toastrMock },
    ],
  });

  const fixture = TestBed.createComponent(CreateClientComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component, clientServiceMock, messageMock };
}

describe('CreateClientComponent', () => {
  it('deve ser criado', () => {
    const { component } = createSuite();
    expect(component).toBeTruthy();
  });

  it('deve expor controles via getters', () => {
    const { component } = createSuite();
    expect(component.nameControl).toBeTruthy();
    expect(component.usernameControl).toBeTruthy();
    expect(component.emailControl).toBeTruthy();
    expect(component.phoneControl).toBeTruthy();
    expect(component.companyControl).toBeTruthy();
    expect(component.notesControl).toBeTruthy();
  });

  it('submit não deve chamar service quando formulário é inválido', () => {
    const { component, clientServiceMock } = createSuite();

    component.submit();

    expect(clientServiceMock.create).not.toHaveBeenCalled();
  });

  it('submit deve marcar campos como touched quando inválido', () => {
    const { component } = createSuite();

    component.submit();

    expect(component.nameControl.touched).toBe(true);
    expect(component.emailControl.touched).toBe(true);
  });

  it('submit deve chamar service.create com os dados do formulário', () => {
    const { component, clientServiceMock } = createSuite();

    component.form.setValue({
      name: 'João',
      username: 'joao',
      email: 'joao@email.com',
      phone: '11999',
      company: 'ACME',
      notes: '',
    });

    component.submit();

    expect(clientServiceMock.create).toHaveBeenCalled();
  });

  it('submit deve exibir mensagem de sucesso e navegar para /clients', () => {
    const { component, clientServiceMock, messageMock } = createSuite();

    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    clientServiceMock.create.mockReturnValue(of({}));

    component.form.setValue({
      name: 'João',
      username: 'joao',
      email: 'joao@email.com',
      phone: '',
      company: 'ACME',
      notes: '',
    });

    component.submit();

    expect(messageMock.success).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/clients']);
  });

  it('redirectToList deve navegar para /clients', () => {
    const { component } = createSuite();

    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.redirectToList();

    expect(navSpy).toHaveBeenCalledWith(['/clients']);
  });
});