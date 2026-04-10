import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { TemplateListComponent } from './template-list.component';
import { FormTemplateService, FormTemplate, FormSubmission, AppointmentResponse, AttendanceRecord } from '../../core/services/form-template.service';
import { ExportService } from '../../core/services/export.service';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { signal } from '@angular/core';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
});

const mockTemplate: FormTemplate = {
  id: 1, name: 'Form A', slug: 'form-a', clientName: 'Cliente X',
  hasSchedule: false, hasAttendance: false, scheduleConfig: null,
  fields: [{ id: 1, label: 'Nome', type: 'text', required: true }],
};

const mockSubmissions: FormSubmission[] = [
  { id: 1, templateId: 1, values: { Nome: 'João' }, createdAt: '2024-01-10T10:00:00' },
  { id: 2, templateId: 1, values: { Nome: 'Maria' }, createdAt: '2024-01-11T11:00:00' },
];

const mockPage = <T>(content: T[], totalPages = 1, totalElements = content.length) => ({
  content, totalPages, totalElements, size: 50, number: 0,
});

function createSuite(slug: string | null = 'form-a') {
  const serviceMock = {
    getTemplateBySlug: vi.fn().mockReturnValue(of(mockTemplate)),
    getSubmissionsByTemplate: vi.fn().mockReturnValue(of(mockPage(mockSubmissions))),
    getAppointmentsByTemplate: vi.fn().mockReturnValue(of(mockPage([]))),
    getAttendance: vi.fn().mockReturnValue(of(mockPage([], 1, 0))),
    deleteSubmission: vi.fn().mockReturnValue(of({})),
    cancelAppointment: vi.fn().mockReturnValue(of({ id: 1, status: 'CANCELADO' })),
    markAttendance: vi.fn().mockReturnValue(of({})),
    updateAttendanceRowData: vi.fn().mockReturnValue(of({})),
    deleteAttendanceRecord: vi.fn().mockReturnValue(of({})),
  };
  const exporterMock = {
    exportSubmissions: vi.fn(),
    exportAppointments: vi.fn(),
    exportAttendance: vi.fn(),
  };
  const messageMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };
  const authMock = {
    user: signal(null),
    role: signal('ROLE_ADMIN'),
    isAdmin: vi.fn().mockReturnValue(true),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TemplateListComponent],
    providers: [
      provideRouter([]),
      importProvidersFrom(BrowserAnimationsModule, ToastrModule.forRoot()),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: {
              get: (key: string) => (key === 'slug' ? slug : null),
            },
          },
        },
      },
      { provide: FormTemplateService, useValue: serviceMock },
      { provide: ExportService, useValue: exporterMock },
      { provide: MessageService, useValue: messageMock },
      { provide: AuthService, useValue: authMock },
    ],
  });

  const fixture = TestBed.createComponent(TemplateListComponent);
  const component = fixture.componentInstance;
  return { fixture, component, serviceMock, exporterMock, messageMock };
}

describe('TemplateListComponent', () => {
  it('deve ser criado', () => {
    const { component } = createSuite();
    expect(component).toBeTruthy();
  });

  // ─── ngOnInit ──────────────────────────────────────────────────────────────

  it('ngOnInit deve carregar template pelo slug', () => {
    const { component, serviceMock } = createSuite();
    component.ngOnInit();
    expect(serviceMock.getTemplateBySlug).toHaveBeenCalledWith('form-a');
    expect(component.template()).toEqual(mockTemplate);
  });

  it('ngOnInit não deve carregar quando slug é null', () => {
    const { component, serviceMock } = createSuite(null);
    component.ngOnInit();
    expect(serviceMock.getTemplateBySlug).not.toHaveBeenCalled();
  });

  it('ngOnInit deve definir loading como false após erro', () => {
    const { component, serviceMock } = createSuite();
    serviceMock.getTemplateBySlug.mockReturnValue(throwError(() => new Error('err')));
    component.ngOnInit();
    expect(component.loading()).toBe(false);
  });

  // ─── formatLabel ───────────────────────────────────────────────────────────

  it('formatLabel deve converter underscores em espaços e capitalizar palavras', () => {
    const { component } = createSuite();
    expect(component.formatLabel('nome_completo')).toBe('Nome Completo');
    expect(component.formatLabel('email')).toBe('Email');
    expect(component.formatLabel('data_nascimento')).toBe('Data Nascimento');
  });

  it('formatTime deve retornar HH:mm dos primeiros 5 chars', () => {
    const { component } = createSuite();
    expect(component.formatTime('10:30:00')).toBe('10:30');
    expect(component.formatTime('')).toBe('');
  });

  // ─── sort / sortIcon / isSorted ────────────────────────────────────────────

  it('sort deve definir sortColumn e direção asc na primeira chamada', () => {
    const { component } = createSuite();
    component.sort('Nome');
    expect(component.sortColumn()).toBe('Nome');
    expect(component.sortDirection()).toBe('asc');
  });

  it('sort deve alternar direção quando mesma coluna é clicada', () => {
    const { component } = createSuite();
    component.sort('Nome');
    component.sort('Nome');
    expect(component.sortDirection()).toBe('desc');
  });

  it('sortIcon deve retornar ↕ para coluna não ordenada', () => {
    const { component } = createSuite();
    expect(component.sortIcon('Nome')).toBe('↕');
  });

  it('sortIcon deve retornar ↑ para coluna ascendente', () => {
    const { component } = createSuite();
    component.sort('Nome');
    expect(component.sortIcon('Nome')).toBe('↑');
  });

  it('sortIcon deve retornar ↓ para coluna descendente', () => {
    const { component } = createSuite();
    component.sort('Nome');
    component.sort('Nome');
    expect(component.sortIcon('Nome')).toBe('↓');
  });

  it('isSorted deve retornar true para coluna ativa', () => {
    const { component } = createSuite();
    component.sort('Nome');
    expect(component.isSorted('Nome')).toBe(true);
  });

  it('isSorted deve retornar false para outra coluna', () => {
    const { component } = createSuite();
    component.sort('Nome');
    expect(component.isSorted('Email')).toBe(false);
  });

  // ─── fieldFilters ──────────────────────────────────────────────────────────

  it('setFieldFilter deve adicionar filtro por chave', () => {
    const { component } = createSuite();
    component.setFieldFilter('nome', 'João');
    expect(component.getFieldFilter('nome')).toBe('João');
  });

  it('clearFilter deve remover filtro específico', () => {
    const { component } = createSuite();
    component.setFieldFilter('nome', 'João');
    component.clearFilter('nome');
    expect(component.getFieldFilter('nome')).toBe('');
  });

  it('clearAllFilters deve limpar busca e todos os filtros', () => {
    const { component } = createSuite();
    component.globalSearch.set('teste');
    component.setFieldFilter('nome', 'João');
    component.clearAllFilters();
    expect(component.globalSearch()).toBe('');
    expect(component.getFieldFilter('nome')).toBe('');
  });

  // ─── changeTab ─────────────────────────────────────────────────────────────

  it('changeTab deve mudar a aba ativa', () => {
    const { component } = createSuite();
    component.changeTab('appointments');
    expect(component.activeTab()).toBe('appointments');
  });

  it('changeTab não deve mudar quando a aba já está ativa', () => {
    const { component, serviceMock } = createSuite();
    component.ngOnInit();
    const calls = serviceMock.getSubmissionsByTemplate.mock.calls.length;
    component.changeTab('submissions'); // já está na aba submissions
    expect(serviceMock.getSubmissionsByTemplate.mock.calls.length).toBe(calls);
  });

  // ─── filteredSubmissions ───────────────────────────────────────────────────

  it('filteredSubmissions deve retornar todas sem busca', () => {
    const { component } = createSuite();
    component.submissions.set(mockSubmissions);
    expect(component.filteredSubmissions()).toHaveLength(2);
  });

  it('filteredSubmissions deve filtrar por busca global', () => {
    const { component } = createSuite();
    component.submissions.set(mockSubmissions);
    component.globalSearch.set('João');
    expect(component.filteredSubmissions()).toHaveLength(1);
  });

  it('filteredSubmissions deve filtrar por ID', () => {
    const { component } = createSuite();
    component.submissions.set(mockSubmissions);
    component.globalSearch.set('1');
    // ID "1" matches submission id=1 e "1" no id=1
    expect(component.filteredSubmissions().length).toBeGreaterThan(0);
  });

  // ─── filteredAppointments ──────────────────────────────────────────────────

  it('filteredAppointments deve retornar todos sem filtro', () => {
    const { component } = createSuite();
    const appt: AppointmentResponse = {
      id: 1, templateId: 1, templateName: 'Agenda', slotDate: '2024-06-15', slotTime: '10:00:00',
      status: 'AGENDADO', bookedByName: 'João', bookedByContact: '999', cancelledBy: null,
      cancelledAt: null, extraValues: {}, createdAt: '2024-06-01T09:00:00',
    };
    component.appointments.set([appt]);
    expect(component.filteredAppointments()).toHaveLength(1);
  });

  it('filteredAppointments deve filtrar por busca', () => {
    const { component } = createSuite();
    const appts: AppointmentResponse[] = [
      { id: 1, templateId: 1, templateName: '', slotDate: '2024-06-15', slotTime: '10:00', status: 'AGENDADO', bookedByName: 'João', bookedByContact: '', cancelledBy: null, cancelledAt: null, extraValues: {}, createdAt: '' },
      { id: 2, templateId: 1, templateName: '', slotDate: '2024-06-16', slotTime: '11:00', status: 'AGENDADO', bookedByName: 'Maria', bookedByContact: '', cancelledBy: null, cancelledAt: null, extraValues: {}, createdAt: '' },
    ];
    component.appointments.set(appts);
    component.globalSearch.set('maria');
    expect(component.filteredAppointments()).toHaveLength(1);
  });

  // ─── attendanceStats ───────────────────────────────────────────────────────

  it('attendanceStats deve contar presentes e ausentes corretamente', () => {
    const { component } = createSuite();
    const records: AttendanceRecord[] = [
      { id: 1, templateId: 1, rowData: {}, attended: true, attendedAt: '', notes: null, rowOrder: 1, createdAt: '' },
      { id: 2, templateId: 1, rowData: {}, attended: false, attendedAt: null, notes: null, rowOrder: 2, createdAt: '' },
      { id: 3, templateId: 1, rowData: {}, attended: true, attendedAt: '', notes: null, rowOrder: 3, createdAt: '' },
    ];
    component.attendance.set(records);
    component.attTotalElements.set(3);
    const stats = component.attendanceStats();
    expect(stats.total).toBe(3);
    expect(stats.presente).toBe(2);
    expect(stats.ausente).toBe(1);
  });

  // ─── attendanceRowClass ────────────────────────────────────────────────────

  it('attendanceRowClass deve retornar row--present para presente', () => {
    const { component } = createSuite();
    const record: AttendanceRecord = { id: 1, templateId: 1, rowData: {}, attended: true, attendedAt: '', notes: null, rowOrder: 1, createdAt: '' };
    expect(component.attendanceRowClass(record)).toEqual({ 'row--present': true });
  });

  it('attendanceRowClass deve retornar falso para ausente', () => {
    const { component } = createSuite();
    const record: AttendanceRecord = { id: 1, templateId: 1, rowData: {}, attended: false, attendedAt: null, notes: null, rowOrder: 1, createdAt: '' };
    expect(component.attendanceRowClass(record)).toEqual({ 'row--present': false });
  });

  // ─── goToXxxPage ───────────────────────────────────────────────────────────

  it('goToApptPage deve atualizar página e recarregar', () => {
    const { component, serviceMock } = createSuite();
    component.template.set(mockTemplate);
    component.goToApptPage(2);
    expect(component.apptPage()).toBe(2);
    expect(serviceMock.getAppointmentsByTemplate).toHaveBeenCalled();
  });

  it('goToSubPage deve atualizar página e recarregar', () => {
    const { component, serviceMock } = createSuite();
    component.template.set(mockTemplate);
    component.goToSubPage(1);
    expect(component.subPage()).toBe(1);
    expect(serviceMock.getSubmissionsByTemplate).toHaveBeenCalled();
  });

  it('goToAttPage deve atualizar página e recarregar', () => {
    const { component, serviceMock } = createSuite();
    component.template.set(mockTemplate);
    component.goToAttPage(1);
    expect(component.attPage()).toBe(1);
    expect(serviceMock.getAttendance).toHaveBeenCalled();
  });

  // ─── doDelete ──────────────────────────────────────────────────────────────

  it('doDelete deve chamar deleteSubmission quando confirmado', () => {
    const { component, serviceMock } = createSuite();
    component.submissions.set(mockSubmissions);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.doDelete(1);
    expect(serviceMock.deleteSubmission).toHaveBeenCalledWith(1);
    vi.restoreAllMocks();
  });

  it('doDelete não deve excluir quando cancelado', () => {
    const { component, serviceMock } = createSuite();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.doDelete(1);
    expect(serviceMock.deleteSubmission).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('doDelete deve exibir erro quando exclusão falha', () => {
    const { component, serviceMock, messageMock } = createSuite();
    serviceMock.deleteSubmission.mockReturnValue(throwError(() => new Error('err')));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.doDelete(1);
    expect(messageMock.error).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  // ─── doCancel ──────────────────────────────────────────────────────────────

  it('doCancel deve chamar cancelAppointment quando confirmado', () => {
    const { component, serviceMock } = createSuite();
    const appt: AppointmentResponse = { id: 1, templateId: 1, templateName: '', slotDate: '', slotTime: '', status: 'AGENDADO', bookedByName: '', bookedByContact: '', cancelledBy: null, cancelledAt: null, extraValues: {}, createdAt: '' };
    component.appointments.set([appt]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.doCancel(1);
    expect(serviceMock.cancelAppointment).toHaveBeenCalledWith(1);
    vi.restoreAllMocks();
  });

  // ─── exports ───────────────────────────────────────────────────────────────

  it('exportSubmissionsXlsx deve chamar exporter quando template disponível', () => {
    const { component, exporterMock } = createSuite();
    component.template.set(mockTemplate);
    component.exportSubmissionsXlsx();
    expect(exporterMock.exportSubmissions).toHaveBeenCalled();
  });

  it('exportAppointmentsXlsx deve chamar exporter quando template disponível', () => {
    const { component, exporterMock } = createSuite();
    component.template.set(mockTemplate);
    component.exportAppointmentsXlsx();
    expect(exporterMock.exportAppointments).toHaveBeenCalled();
  });

  it('exportAttendanceXlsx deve chamar exporter quando template disponível', () => {
    const { component, exporterMock } = createSuite();
    component.template.set(mockTemplate);
    component.exportAttendanceXlsx();
    expect(exporterMock.exportAttendance).toHaveBeenCalled();
  });

  // ─── toggleAttendance ──────────────────────────────────────────────────────

  it('toggleAttendance deve atualizar presença e limpar markingId', () => {
    const { component, serviceMock } = createSuite();
    const record: AttendanceRecord = { id: 1, templateId: 1, rowData: {}, attended: false, attendedAt: null, notes: null, rowOrder: 1, createdAt: '' };
    const updated = { ...record, attended: true };
    serviceMock.markAttendance.mockReturnValue(of(updated));
    component.attendance.set([record]);
    component.toggleAttendance(record);
    expect(serviceMock.markAttendance).toHaveBeenCalled();
    expect(component.markingId()).toBeNull();
  });

  it('toggleAttendance deve exibir erro quando falha', () => {
    const { component, serviceMock, messageMock } = createSuite();
    const record: AttendanceRecord = { id: 1, templateId: 1, rowData: {}, attended: false, attendedAt: null, notes: null, rowOrder: 1, createdAt: '' };
    serviceMock.markAttendance.mockReturnValue(throwError(() => new Error('err')));
    component.attendance.set([record]);
    component.toggleAttendance(record);
    expect(messageMock.error).toHaveBeenCalled();
  });

  // ─── saveNote ──────────────────────────────────────────────────────────────

  it('saveNote deve atualizar observação', () => {
    const { component, serviceMock } = createSuite();
    const record: AttendanceRecord = { id: 1, templateId: 1, rowData: {}, attended: true, attendedAt: '', notes: null, rowOrder: 1, createdAt: '' };
    const updated = { ...record, notes: 'Presente' };
    serviceMock.markAttendance.mockReturnValue(of(updated));
    component.attendance.set([record]);
    component.saveNote(record, 'Presente');
    expect(serviceMock.markAttendance).toHaveBeenCalled();
  });

  // ─── saveRowField ──────────────────────────────────────────────────────────

  it('saveRowField não deve salvar quando valor não mudou', () => {
    const { component, serviceMock } = createSuite();
    const record: AttendanceRecord = { id: 1, templateId: 1, rowData: { nome: 'João' }, attended: true, attendedAt: '', notes: null, rowOrder: 1, createdAt: '' };
    component.saveRowField(record, 'nome', 'João');
    expect(serviceMock.updateAttendanceRowData).not.toHaveBeenCalled();
  });

  it('saveRowField deve salvar quando valor mudou', () => {
    const { component, serviceMock } = createSuite();
    const record: AttendanceRecord = { id: 1, templateId: 1, rowData: { nome: 'João' }, attended: true, attendedAt: '', notes: null, rowOrder: 1, createdAt: '' };
    serviceMock.updateAttendanceRowData.mockReturnValue(of(record));
    component.attendance.set([record]);
    component.saveRowField(record, 'nome', 'Maria');
    expect(serviceMock.updateAttendanceRowData).toHaveBeenCalledWith(1, { nome: 'Maria' });
  });

  // ─── filteredAttendance ────────────────────────────────────────────────────

  it('filteredAttendance deve retornar todos quando busca está vazia', () => {
    const { component } = createSuite();
    const records: AttendanceRecord[] = [
      { id: 1, templateId: 1, rowData: { nome: 'João' }, attended: true, attendedAt: '', notes: null, rowOrder: 1, createdAt: '' },
    ];
    component.attendance.set(records);
    expect(component.filteredAttendance()).toHaveLength(1);
  });

  it('filteredAttendance deve filtrar por busca', () => {
    const { component } = createSuite();
    const records: AttendanceRecord[] = [
      { id: 1, templateId: 1, rowData: { nome: 'João' }, attended: true, attendedAt: '', notes: null, rowOrder: 1, createdAt: '' },
      { id: 2, templateId: 1, rowData: { nome: 'Maria' }, attended: false, attendedAt: null, notes: 'obs', rowOrder: 2, createdAt: '' },
    ];
    component.attendance.set(records);
    component.attendanceSearch.set('maria');
    expect(component.filteredAttendance()).toHaveLength(1);
  });

  // ─── activeFiltersCount ────────────────────────────────────────────────────

  it('activeFiltersCount deve contar filtros ativos', () => {
    const { component } = createSuite();
    component.globalSearch.set('teste');
    component.setFieldFilter('nome', 'João');
    expect(component.activeFiltersCount()).toBe(2);
  });

  // ─── changePageSize ────────────────────────────────────────────────────────

  it('changePageSize deve atualizar pageSize e resetar páginas', () => {
    const { component } = createSuite();
    component.apptPage.set(2);
    component.subPage.set(1);
    component.attPage.set(3);
    component.changePageSize(20);
    expect(component.pageSize()).toBe(20);
    expect(component.apptPage()).toBe(0);
    expect(component.subPage()).toBe(0);
    expect(component.attPage()).toBe(0);
  });
});
