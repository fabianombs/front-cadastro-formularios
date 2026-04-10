import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { HomeComponent } from './home.component';
import { DashboardService, DashboardSummary, TemplateStatResponse } from '../../core/services/dashboard.service';
import { MessageService } from '../../core/services/message.service';

const makeTemplate = (overrides: Partial<TemplateStatResponse> = {}): TemplateStatResponse => ({
  id: 1, name: 'Form A', slug: 'form-a', clientName: 'Cliente X',
  hasSchedule: false, fieldCount: 2, submissionCount: 10,
  appointmentTotal: 0, appointmentConfirmed: 0, appointmentCancelled: 0,
  attendanceTotal: 0, attendancePresent: 0,
  ...overrides,
});

const makeSummary = (templates: TemplateStatResponse[] = [makeTemplate()]): DashboardSummary => ({
  totalTemplates: 1, totalClients: 1, totalSubmissions: 10,
  totalAppointments: 0, confirmedAppointments: 0, cancelledAppointments: 0,
  totalAttendanceRecords: 0, presentAttendanceRecords: 0,
  formTemplateCount: 1, appointmentTemplateCount: 2, attendanceTemplateCount: 3,
  templates,
  page: 0, size: 5, totalElements: 1, totalPages: 1,
  globalTotalSubmissions: 10, globalTotalAppointments: 20,
  globalConfirmedAppointments: 15, globalCancelledAppointments: 5,
  globalTotalAttendanceRecords: 30, globalPresentAttendanceRecords: 25,
});

function createSuite() {
  const dashMock = {
    getSummary: vi.fn().mockReturnValue(of(makeSummary())),
  };
  const messageMock = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      provideRouter([]),
      importProvidersFrom(BrowserAnimationsModule, ToastrModule.forRoot()),
      { provide: DashboardService, useValue: dashMock },
      { provide: MessageService, useValue: messageMock },
    ],
  });

  const fixture = TestBed.createComponent(HomeComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, component, dashMock, messageMock };
}

describe('HomeComponent', () => {
  it('deve ser criado', () => {
    const { component } = createSuite();
    expect(component).toBeTruthy();
  });

  // ─── loadData ──────────────────────────────────────────────────────────────

  it('loadData deve popular templates e summary', () => {
    const { component } = createSuite();
    expect(component.templates).toHaveLength(1);
    expect(component.summary).not.toBeNull();
    expect(component.loadingData).toBe(false);
  });

  it('loadData deve definir loadingData como false após erro', () => {
    const { component, dashMock } = createSuite();
    dashMock.getSummary.mockReturnValue(throwError(() => new Error('err')));
    component.loadData();
    expect(component.loadingData).toBe(false);
  });

  it('loadData deve atualizar pagination com dados da resposta', () => {
    const { component } = createSuite();
    expect(component.pagination.page).toBe(0);
    expect(component.pagination.size).toBe(5);
  });

  // ─── inferType ─────────────────────────────────────────────────────────────

  it('inferType deve retornar "agendamento" quando hasSchedule é true', () => {
    const { component } = createSuite();
    const t = makeTemplate({ hasSchedule: true });
    expect(component.inferType(t)).toBe('agendamento');
  });

  it('inferType deve retornar "lista-presenca" quando attendanceTotal > 0', () => {
    const { component } = createSuite();
    const t = makeTemplate({ hasSchedule: false, attendanceTotal: 5 });
    expect(component.inferType(t)).toBe('lista-presenca');
  });

  it('inferType deve retornar "formulario" como padrão', () => {
    const { component } = createSuite();
    const t = makeTemplate({ hasSchedule: false, attendanceTotal: 0 });
    expect(component.inferType(t)).toBe('formulario');
  });

  // ─── attendancePercent ─────────────────────────────────────────────────────

  it('attendancePercent deve retornar 0 para tipo formulario', () => {
    const { component } = createSuite();
    const t = makeTemplate({ hasSchedule: false, attendanceTotal: 0 });
    expect(component.attendancePercent(t)).toBe(0);
  });

  it('attendancePercent deve calcular percentual para agendamento', () => {
    const { component } = createSuite();
    const t = makeTemplate({ hasSchedule: true, appointmentTotal: 10, appointmentConfirmed: 8 });
    expect(component.attendancePercent(t)).toBe(80);
  });

  it('attendancePercent deve retornar 0 para agendamento sem total', () => {
    const { component } = createSuite();
    const t = makeTemplate({ hasSchedule: true, appointmentTotal: 0, appointmentConfirmed: 0 });
    expect(component.attendancePercent(t)).toBe(0);
  });

  it('attendancePercent deve calcular percentual para lista de presença', () => {
    const { component } = createSuite();
    const t = makeTemplate({ hasSchedule: false, attendanceTotal: 20, attendancePresent: 15 });
    expect(component.attendancePercent(t)).toBe(75);
  });

  it('attendancePercent deve retornar 0 para lista de presença sem total', () => {
    const { component } = createSuite();
    const t = makeTemplate({ hasSchedule: false, attendanceTotal: 0, attendancePresent: 0 });
    expect(component.attendancePercent(t)).toBe(0);
  });

  // ─── kpiCards ─────────────────────────────────────────────────────────────

  it('kpiCards deve retornar lista vazia quando summary é null', () => {
    const { component } = createSuite();
    component.summary = null;
    expect(component.kpiCards()).toEqual([]);
  });

  it('kpiCards deve retornar 3 cards quando summary está disponível', () => {
    const { component } = createSuite();
    const cards = component.kpiCards();
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.type)).toEqual(['formulario', 'agendamento', 'lista-presenca']);
  });

  it('kpiCards deve calcular presencaPercent para agendamentos', () => {
    const { component } = createSuite();
    const cards = component.kpiCards();
    const agendCard = cards.find((c) => c.type === 'agendamento')!;
    // globalTotalAppointments=20, globalConfirmedAppointments=15 → 75%
    expect(agendCard.presencaPercent).toBe(75);
  });

  it('kpiCards deve calcular presencaPercent para lista de presença', () => {
    const { component } = createSuite();
    const cards = component.kpiCards();
    const presCard = cards.find((c) => c.type === 'lista-presenca')!;
    // globalTotalAttendanceRecords=30, globalPresentAttendanceRecords=25 → ~83.33%
    expect(presCard.presencaPercent).toBeCloseTo(83.33, 1);
  });

  // ─── templateCard ──────────────────────────────────────────────────────────

  it('templateCard deve retornar um KpiCard com os dados do template', () => {
    const { component } = createSuite();
    const t = makeTemplate({ submissionCount: 5, appointmentTotal: 10, appointmentConfirmed: 7 });
    const card = component.templateCard(t);
    expect(card.type).toBe('formulario');
    expect(card.submissoes).toBe(5);
    expect(card.agendamentos).toBe(10);
    expect(card.confirmados).toBe(7);
  });

  // ─── filteredTemplates ─────────────────────────────────────────────────────

  it('filteredTemplates deve retornar todos sem filtros', () => {
    const { component } = createSuite();
    expect(component.filteredTemplates()).toHaveLength(1);
  });

  it('filteredTemplates deve filtrar por texto no nome', () => {
    const { component, dashMock } = createSuite();
    dashMock.getSummary.mockReturnValue(of(makeSummary([
      makeTemplate({ name: 'Alpha' }),
      makeTemplate({ id: 2, name: 'Beta' }),
    ])));
    component.loadData();
    component.search.set('beta');
    expect(component.filteredTemplates()).toHaveLength(1);
  });

  it('filteredTemplates deve filtrar por tipo', () => {
    const { component, dashMock } = createSuite();
    dashMock.getSummary.mockReturnValue(of(makeSummary([
      makeTemplate({ hasSchedule: true }),
      makeTemplate({ id: 2, hasSchedule: false }),
    ])));
    component.loadData();
    component.typeFilter.set('agendamento');
    const result = component.filteredTemplates();
    expect(result.every((t) => t.hasSchedule)).toBe(true);
  });

  // ─── onPageChange ──────────────────────────────────────────────────────────

  it('onPageChange deve recarregar dados da nova página', () => {
    const { component, dashMock } = createSuite();
    const callsBefore = dashMock.getSummary.mock.calls.length;
    component.onPageChange(2);
    expect(dashMock.getSummary.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  // ─── clearHomeFilters ──────────────────────────────────────────────────────

  it('clearHomeFilters deve redefinir search e typeFilter', () => {
    const { component } = createSuite();
    component.search.set('algo');
    component.typeFilter.set('agendamento');
    component.clearHomeFilters();
    expect(component.search()).toBe('');
    expect(component.typeFilter()).toBe('all');
  });

  // ─── exportDashboard ──────────────────────────────────────────────────────

  it('exportDashboard deve exibir mensagem de info', () => {
    const { component, messageMock } = createSuite();
    component.exportDashboard();
    expect(messageMock.info).toHaveBeenCalled();
  });

  // ─── ngOnDestroy ──────────────────────────────────────────────────────────

  it('ngOnDestroy deve ser chamado sem erros', () => {
    const { component } = createSuite();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
