import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { FormsAllComponent } from './forms-all.component';
import { DashboardService, DashboardSummary, TemplateStatResponse } from '../../core/services/dashboard.service';
import { FormTemplateService } from '../../core/services/form-template.service';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { ClientService } from '../../core/services/client.service';

const mockTemplate = (overrides: Partial<TemplateStatResponse> = {}): TemplateStatResponse => ({
  id: 1, name: 'Form A', slug: 'form-a', clientName: 'Cliente X',
  hasSchedule: false, fieldCount: 2, submissionCount: 10,
  appointmentTotal: 0, appointmentConfirmed: 0, appointmentCancelled: 0,
  attendanceTotal: 0, attendancePresent: 0,
  ...overrides,
});

const mockSummary = (templates: TemplateStatResponse[] = [mockTemplate()]): DashboardSummary => ({
  totalTemplates: 1, totalClients: 1, totalSubmissions: 10,
  totalAppointments: 0, confirmedAppointments: 0, cancelledAppointments: 0,
  totalAttendanceRecords: 0, presentAttendanceRecords: 0,
  formTemplateCount: 1, appointmentTemplateCount: 0, attendanceTemplateCount: 0,
  templates,
  page: 0, size: 10, totalElements: 1, totalPages: 1,
  globalTotalSubmissions: 10, globalTotalAppointments: 0,
  globalConfirmedAppointments: 0, globalCancelledAppointments: 0,
  globalTotalAttendanceRecords: 0, globalPresentAttendanceRecords: 0,
});

function createSuite() {
  const dashMock = {
    getSummary: vi.fn().mockReturnValue(of(mockSummary())),
  };
  const templateMock = {
    deleteTemplate: vi.fn().mockReturnValue(of({})),
    duplicateTemplate: vi.fn().mockReturnValue(of({ id: 9, slug: 'form-a-copia' })),
  };
  const clientMock = {
    findAll: vi.fn().mockReturnValue(of({ content: [{ id: 3, name: 'Cliente X' }, { id: 4, name: 'Cliente Y' }] })),
  };
  const messageMock = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };
  // isAdmin/isFuncionario leem o signal role, como no AuthService real,
  // para que os computed do componente reajam à troca de papel no teste
  const role = signal('ROLE_ADMIN');
  const authMock = {
    user: signal(null),
    role,
    isAdmin: vi.fn(() => role() === 'ROLE_ADMIN'),
    isFuncionario: vi.fn(() => role() === 'ROLE_FUNCIONARIO'),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [FormsAllComponent],
    providers: [
      provideRouter([]),
      importProvidersFrom(BrowserAnimationsModule, ToastrModule.forRoot()),
      { provide: DashboardService, useValue: dashMock },
      { provide: FormTemplateService, useValue: templateMock },
      { provide: MessageService, useValue: messageMock },
      { provide: AuthService, useValue: authMock },
      { provide: ClientService, useValue: clientMock },
    ],
  });

  const fixture = TestBed.createComponent(FormsAllComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, component, dashMock, templateMock, messageMock, authMock, clientMock };
}

describe('FormsAllComponent', () => {
  it('deve ser criado', () => {
    const { component } = createSuite();
    expect(component).toBeTruthy();
  });

  // ─── loadTemplates ─────────────────────────────────────────────────────────

  it('loadTemplates deve popular templates, totalPages e totalElements', () => {
    const { component } = createSuite();
    expect(component.templates()).toHaveLength(1);
    expect(component.totalPages()).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('loadTemplates deve definir loading como false após erro', () => {
    const { component, dashMock } = createSuite();
    dashMock.getSummary.mockReturnValue(throwError(() => new Error('err')));
    component.loadTemplates();
    expect(component.loading()).toBe(false);
  });

  // ─── filteredTemplates ─────────────────────────────────────────────────────

  it('filteredTemplates deve retornar todos quando busca está vazia', () => {
    const { component } = createSuite();
    expect(component.filteredTemplates()).toHaveLength(1);
  });

  it('filteredTemplates deve filtrar por nome', () => {
    const { component, dashMock } = createSuite();
    const templates = [mockTemplate({ name: 'Form A' }), mockTemplate({ id: 2, name: 'Agenda B' })];
    dashMock.getSummary.mockReturnValue(of(mockSummary(templates)));
    component.loadTemplates();
    component.searchQuery.set('agenda');
    expect(component.filteredTemplates()).toHaveLength(1);
    expect(component.filteredTemplates()[0].name).toBe('Agenda B');
  });

  it('filteredTemplates deve filtrar por nome do cliente', () => {
    const { component, dashMock } = createSuite();
    const templates = [
      mockTemplate({ clientName: 'Empresa X' }),
      mockTemplate({ id: 2, clientName: 'Empresa Y' }),
    ];
    dashMock.getSummary.mockReturnValue(of(mockSummary(templates)));
    component.loadTemplates();
    component.searchQuery.set('empresa y');
    expect(component.filteredTemplates()).toHaveLength(1);
  });

  // ─── onSearchChange / clearSearch ─────────────────────────────────────────

  it('onSearchChange deve atualizar searchQuery e recarregar', () => {
    const { component, dashMock } = createSuite();
    const callsBefore = dashMock.getSummary.mock.calls.length;
    component.onSearchChange('novo');
    expect(component.searchQuery()).toBe('novo');
    expect(dashMock.getSummary.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('clearSearch deve limpar searchQuery e recarregar', () => {
    const { component, dashMock } = createSuite();
    component.searchQuery.set('algo');
    const callsBefore = dashMock.getSummary.mock.calls.length;
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
    expect(dashMock.getSummary.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  // ─── isAttendanceCard / isFormCard ─────────────────────────────────────────

  it('isAttendanceCard deve retornar true para template sem agenda com presença', () => {
    const { component } = createSuite();
    const t = mockTemplate({ hasSchedule: false, attendanceTotal: 5 });
    expect(component.isAttendanceCard(t)).toBe(true);
  });

  it('isAttendanceCard deve retornar false para template com agenda', () => {
    const { component } = createSuite();
    const t = mockTemplate({ hasSchedule: true, attendanceTotal: 5 });
    expect(component.isAttendanceCard(t)).toBe(false);
  });

  it('isFormCard deve retornar true para template sem agenda e sem presença', () => {
    const { component } = createSuite();
    const t = mockTemplate({ hasSchedule: false, attendanceTotal: 0 });
    expect(component.isFormCard(t)).toBe(true);
  });

  it('isFormCard deve retornar false para template com presença', () => {
    const { component } = createSuite();
    const t = mockTemplate({ hasSchedule: false, attendanceTotal: 3 });
    expect(component.isFormCard(t)).toBe(false);
  });

  // ─── goToPage ──────────────────────────────────────────────────────────────

  it('goToPage deve atualizar page e recarregar', () => {
    const { component, dashMock } = createSuite();
    const callsBefore = dashMock.getSummary.mock.calls.length;
    component.goToPage(2);
    expect(component.page()).toBe(2);
    expect(dashMock.getSummary.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  // ─── deleteTemplate / onDeleteConfirmed / onDeleteCancelled ───────────────

  it('deleteTemplate deve abrir modal com id e nome do template', () => {
    const { component } = createSuite();
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as Event;
    component.deleteTemplate(42, 'Form X', event);
    expect(component.deleteModalOpen()).toBe(true);
    expect(component.deleteTargetId()).toBe(42);
    expect(component.deleteTargetName()).toBe('Form X');
  });

  it('onDeleteConfirmed deve chamar deleteTemplate e fechar modal após sucesso', () => {
    const { component, templateMock, messageMock } = createSuite();
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as Event;
    component.deleteTemplate(1, 'Form A', event);
    component.onDeleteConfirmed();
    expect(templateMock.deleteTemplate).toHaveBeenCalledWith(1);
    expect(messageMock.success).toHaveBeenCalled();
    expect(component.deleteModalOpen()).toBe(false);
  });

  it('onDeleteConfirmed deve exibir erro quando exclusão falha', () => {
    const { component, templateMock, messageMock } = createSuite();
    templateMock.deleteTemplate.mockReturnValue(throwError(() => new Error('err')));
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as Event;
    component.deleteTemplate(1, 'Form A', event);
    component.onDeleteConfirmed();
    expect(messageMock.error).toHaveBeenCalled();
    expect(component.deleting()).toBe(false);
  });

  it('onDeleteConfirmed não deve chamar deleteTemplate quando deleteTargetId é null', () => {
    const { component, templateMock } = createSuite();
    component.deleteTargetId.set(null);
    component.onDeleteConfirmed();
    expect(templateMock.deleteTemplate).not.toHaveBeenCalled();
  });

  it('onDeleteCancelled deve fechar modal e limpar campos', () => {
    const { component } = createSuite();
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as Event;
    component.deleteTemplate(1, 'Form A', event);
    component.onDeleteCancelled();
    expect(component.deleteModalOpen()).toBe(false);
    expect(component.deleteTargetId()).toBeNull();
    expect(component.deleteTargetName()).toBe('');
  });

  // ─── duplicar ─────────────────────────────────────────────────────────────

  const ev = () => ({ stopPropagation: vi.fn(), preventDefault: vi.fn() }) as unknown as Event;

  it('openDuplicate deve abrir modal com cliente do original e nome "(cópia)" e carregar clientes', () => {
    const { component, clientMock } = createSuite();
    component.openDuplicate(mockTemplate({ id: 7, name: 'Cadastro', clientId: 3 }), ev());
    expect(component.duplicateModalOpen()).toBe(true);
    expect(component.duplicateSourceId()).toBe(7);
    expect(component.duplicateClientId()).toBe(3);
    expect(component.duplicateName()).toBe('Cadastro (cópia)');
    expect(clientMock.findAll).toHaveBeenCalledTimes(1);
    expect(component.clients()).toHaveLength(2);
  });

  it('openDuplicate não deve recarregar clientes já carregados', () => {
    const { component, clientMock } = createSuite();
    component.openDuplicate(mockTemplate(), ev());
    component.onDuplicateCancelled();
    component.openDuplicate(mockTemplate(), ev());
    expect(clientMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('onDuplicateConfirmed deve enviar cliente escolhido e nome, avisar sucesso, fechar e recarregar', () => {
    const { component, templateMock, messageMock, dashMock } = createSuite();
    component.openDuplicate(mockTemplate({ id: 7, clientId: 3 }), ev());
    component.duplicateClientId.set(4);
    component.duplicateName.set('  Cadastro Novo  ');
    const callsBefore = dashMock.getSummary.mock.calls.length;
    component.onDuplicateConfirmed();
    expect(templateMock.duplicateTemplate).toHaveBeenCalledWith(7, { clientId: 4, name: 'Cadastro Novo' });
    expect(messageMock.success).toHaveBeenCalled();
    expect(component.duplicateModalOpen()).toBe(false);
    expect(dashMock.getSummary.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('onDuplicateConfirmed sem cliente não deve chamar o serviço', () => {
    const { component, templateMock, messageMock } = createSuite();
    component.openDuplicate(mockTemplate({ clientId: null }), ev());
    component.onDuplicateConfirmed();
    expect(templateMock.duplicateTemplate).not.toHaveBeenCalled();
    expect(messageMock.warning).toHaveBeenCalled();
    expect(component.duplicateModalOpen()).toBe(true);
  });

  it('onDuplicateConfirmed sem nome não deve chamar o serviço', () => {
    const { component, templateMock, messageMock } = createSuite();
    component.openDuplicate(mockTemplate({ clientId: 3 }), ev());
    component.duplicateName.set('   ');
    component.onDuplicateConfirmed();
    expect(templateMock.duplicateTemplate).not.toHaveBeenCalled();
    expect(messageMock.warning).toHaveBeenCalled();
  });

  it('onDuplicateConfirmed deve mostrar a mensagem do servidor quando falha e manter modal aberto', () => {
    const { component, templateMock, messageMock } = createSuite();
    templateMock.duplicateTemplate.mockReturnValue(
      throwError(() => ({ error: { message: 'Cliente não encontrado' } })),
    );
    component.openDuplicate(mockTemplate({ clientId: 3 }), ev());
    component.onDuplicateConfirmed();
    expect(messageMock.error).toHaveBeenCalledWith('Cliente não encontrado');
    expect(component.duplicating()).toBe(false);
    expect(component.duplicateModalOpen()).toBe(true);
  });

  const duplicateButtons = (el: HTMLElement) =>
    (Array.from(el.querySelectorAll('button')) as HTMLElement[]).filter((b) => b.textContent?.trim() === 'Duplicar');

  it('botão Duplicar aparece para ADMIN e FUNCIONARIO', () => {
    const { fixture, authMock } = createSuite();
    expect(duplicateButtons(fixture.nativeElement)).toHaveLength(1);
    authMock.role.set('ROLE_FUNCIONARIO');
    fixture.detectChanges();
    expect(duplicateButtons(fixture.nativeElement)).toHaveLength(1);
  });

  it('botão Duplicar não aparece para CLIENT', () => {
    const { fixture, authMock } = createSuite();
    authMock.role.set('ROLE_CLIENT');
    fixture.detectChanges();
    expect(duplicateButtons(fixture.nativeElement)).toHaveLength(0);
  });
});
