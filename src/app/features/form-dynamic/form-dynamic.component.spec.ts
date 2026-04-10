import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { FormDynamicComponent } from './form-dynamic.component';
import { FormTemplateService, FormTemplate, SlotInfo } from '../../core/services/form-template.service';
import { MessageService } from '../../core/services/message.service';

const mockTemplate: FormTemplate = {
  id: 1,
  name: 'Formulário Teste',
  slug: 'formulario-teste',
  fields: [
    { id: 1, label: 'Nome', type: 'text', required: true },
    { id: 2, label: 'Email', type: 'email', required: false },
  ],
  clientName: 'Cliente X',
  hasSchedule: false,
  hasAttendance: false,
  scheduleConfig: null,
};

const mockScheduledTemplate: FormTemplate = {
  ...mockTemplate,
  id: 2,
  hasSchedule: true,
  scheduleConfig: {
    startTime: '08:00:00',
    endTime: '18:00:00',
    slotDurationMinutes: 30,
    maxDaysAhead: 30,
    slotCapacity: 1,
    dedupFields: [],
  },
};

function createSuite(slug: string | null = 'formulario-teste', template = mockTemplate) {
  const templateServiceMock = {
    getTemplateBySlug: vi.fn().mockReturnValue(of(template)),
    submitForm: vi.fn().mockReturnValue(of({})),
    getAvailableSlots: vi.fn().mockReturnValue(of({ slots: [] })),
    bookAppointment: vi.fn().mockReturnValue(of({})),
  };
  const messageMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [FormDynamicComponent, ReactiveFormsModule],
    providers: [
      provideRouter([]),
      importProvidersFrom(BrowserAnimationsModule, ToastrModule.forRoot()),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { params: { slug } },
          params: of({ slug }),
        },
      },
      { provide: FormTemplateService, useValue: templateServiceMock },
      { provide: MessageService, useValue: messageMock },
    ],
  });

  const fixture = TestBed.createComponent(FormDynamicComponent);
  const component = fixture.componentInstance;
  return { fixture, component, templateServiceMock, messageMock };
}

describe('FormDynamicComponent', () => {
  it('deve ser criado', () => {
    const { component } = createSuite();
    expect(component).toBeTruthy();
  });

  // ─── ngOnInit ──────────────────────────────────────────────────────────────

  it('ngOnInit deve carregar o template pelo slug', () => {
    const { component, templateServiceMock } = createSuite();
    component.ngOnInit();
    expect(templateServiceMock.getTemplateBySlug).toHaveBeenCalledWith('formulario-teste');
    expect(component.template()).toEqual(mockTemplate);
    expect(component.loading()).toBe(false);
  });

  it('ngOnInit não deve fazer requisição quando slug é null', () => {
    const { component, templateServiceMock } = createSuite(null);
    component.ngOnInit();
    expect(templateServiceMock.getTemplateBySlug).not.toHaveBeenCalled();
  });

  it('ngOnInit deve tratar erro ao carregar template', () => {
    const { component, templateServiceMock } = createSuite();
    templateServiceMock.getTemplateBySlug.mockReturnValue(throwError(() => new Error('err')));
    component.ngOnInit();
    expect(component.loading()).toBe(false);
  });

  // ─── minDate / maxDate ─────────────────────────────────────────────────────

  it('minDate deve retornar a data de hoje no formato ISO', () => {
    const { component } = createSuite();
    const today = new Date().toISOString().split('T')[0];
    expect(component.minDate).toBe(today);
  });

  it('maxDate deve retornar string vazia quando não há scheduleConfig', () => {
    const { component } = createSuite();
    component.template.set(mockTemplate);
    expect(component.maxDate).toBe('');
  });

  it('maxDate deve calcular data máxima com base em maxDaysAhead', () => {
    const { component } = createSuite();
    component.template.set(mockScheduledTemplate);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    expect(component.maxDate).toBe(maxDate.toISOString().split('T')[0]);
  });

  // ─── vacancyLabel ──────────────────────────────────────────────────────────

  it('vacancyLabel deve retornar "Lotado" para slot não disponível', () => {
    const { component } = createSuite();
    const slot: SlotInfo = { time: '10:00:00', available: false, bookedCount: 1, capacity: 1 };
    expect(component.vacancyLabel(slot)).toBe('Lotado');
  });

  it('vacancyLabel deve retornar "Disponível" para slot disponível sem capacidade múltipla', () => {
    const { component } = createSuite();
    const slot: SlotInfo = { time: '10:00:00', available: true, capacity: 1, bookedCount: 0 };
    expect(component.vacancyLabel(slot)).toBe('Disponível');
  });

  it('vacancyLabel deve retornar "Disponível" para slot sem capacidade definida (undefined)', () => {
    const { component } = createSuite();
    // guard no código usa ?? 0, então undefined/null funciona
    const slot = { time: '10:00:00', available: true } as SlotInfo;
    expect(component.vacancyLabel(slot)).toBe('Disponível');
  });

  it('vacancyLabel deve retornar "1 vaga" quando resta apenas 1 vaga', () => {
    const { component } = createSuite();
    const slot: SlotInfo = { time: '10:00:00', available: true, capacity: 5, bookedCount: 4 };
    expect(component.vacancyLabel(slot)).toBe('1 vaga');
  });

  it('vacancyLabel deve retornar quantidade de vagas para múltiplas vagas', () => {
    const { component } = createSuite();
    const slot: SlotInfo = { time: '10:00:00', available: true, capacity: 5, bookedCount: 2 };
    expect(component.vacancyLabel(slot)).toBe('3 vagas');
  });

  it('vacancyLabel deve retornar "Lotado" quando não há vagas restantes', () => {
    const { component } = createSuite();
    const slot: SlotInfo = { time: '10:00:00', available: true, capacity: 3, bookedCount: 3 };
    expect(component.vacancyLabel(slot)).toBe('Lotado');
  });

  // ─── occupancyPercent ──────────────────────────────────────────────────────

  it('occupancyPercent deve retornar 0 para slot disponível sem capacidade', () => {
    const { component } = createSuite();
    const slot = { time: '10:00:00', available: true } as SlotInfo;
    expect(component.occupancyPercent(slot)).toBe(0);
  });

  it('occupancyPercent deve retornar 100 para slot indisponível sem capacidade', () => {
    const { component } = createSuite();
    const slot = { time: '10:00:00', available: false } as SlotInfo;
    expect(component.occupancyPercent(slot)).toBe(100);
  });

  it('occupancyPercent deve calcular percentual correto', () => {
    const { component } = createSuite();
    const slot: SlotInfo = { time: '10:00:00', available: true, capacity: 4, bookedCount: 3 };
    expect(component.occupancyPercent(slot)).toBe(75);
  });

  it('occupancyPercent não deve ultrapassar 100', () => {
    const { component } = createSuite();
    const slot: SlotInfo = { time: '10:00:00', available: true, capacity: 2, bookedCount: 3 };
    expect(component.occupancyPercent(slot)).toBe(100);
  });

  // ─── formatTime ────────────────────────────────────────────────────────────

  it('formatTime deve retornar os primeiros 5 caracteres (HH:mm)', () => {
    const { component } = createSuite();
    expect(component.formatTime('10:30:00')).toBe('10:30');
  });

  // ─── selectSlot ────────────────────────────────────────────────────────────

  it('selectSlot deve definir selectedSlot para slot disponível', () => {
    const { component } = createSuite();
    const slot: SlotInfo = {
      time: '10:00:00', available: true,
      bookedCount: 0,
      capacity: 0
    };
    component.selectSlot(slot);
    expect(component.selectedSlot()).toBe('10:00:00');
  });

  it('selectSlot não deve mudar selectedSlot para slot indisponível', () => {
    const { component } = createSuite();
    const slot: SlotInfo = {
      time: '10:00:00', available: false,
      bookedCount: 0,
      capacity: 0
    };
    component.selectSlot(slot);
    expect(component.selectedSlot()).toBe('');
  });

  // ─── fieldLabelStyle ───────────────────────────────────────────────────────

  it('fieldLabelStyle deve retornar objeto vazio sem appearance', () => {
    const { component } = createSuite();
    component.template.set(mockTemplate);
    expect(component.fieldLabelStyle()).toEqual({});
  });

  it('fieldLabelStyle deve incluir cor do campo se fornecida', () => {
    const { component } = createSuite();
    const style = component.fieldLabelStyle('#ff0000');
    expect(style['color']).toBe('#ff0000');
  });

  // ─── pageStyle computed ────────────────────────────────────────────────────

  it('pageStyle deve retornar objeto vazio sem appearance', () => {
    const { component } = createSuite();
    component.template.set(mockTemplate);
    expect(component.pageStyle()).toEqual({});
  });

  it('pageStyle deve aplicar backgroundColor quando definido', () => {
    const { component } = createSuite();
    component.template.set({
      ...mockTemplate,
      appearance: { backgroundColor: '#112233' } as any,
    });
    const style = component.pageStyle();
    expect(style['backgroundColor']).toBe('#112233');
  });

  it('pageStyle deve aplicar gradient quando definido', () => {
    const { component } = createSuite();
    component.template.set({
      ...mockTemplate,
      appearance: { backgroundGradient: 'linear-gradient(#000, #fff)' } as any,
    });
    const style = component.pageStyle();
    expect(style['background']).toBe('linear-gradient(#000, #fff)');
  });

  // ─── formCardStyle computed ────────────────────────────────────────────────

  it('formCardStyle deve retornar objeto vazio sem appearance', () => {
    const { component } = createSuite();
    component.template.set(mockTemplate);
    expect(component.formCardStyle()).toEqual({});
  });

  it('formCardStyle deve aplicar cardBackgroundColor quando definido', () => {
    const { component } = createSuite();
    component.template.set({
      ...mockTemplate,
      appearance: { cardBackgroundColor: '#223344' } as any,
    });
    const style = component.formCardStyle();
    expect(style['background']).toBe('#223344');
  });

  // ─── titleStyle / submitBtnStyle ───────────────────────────────────────────

  it('titleStyle deve retornar objeto vazio sem appearance', () => {
    const { component } = createSuite();
    component.template.set(mockTemplate);
    expect(component.titleStyle()).toEqual({});
  });

  it('submitBtnStyle deve retornar objeto vazio sem appearance nem primaryColor', () => {
    const { component } = createSuite();
    component.template.set(mockTemplate);
    expect(component.submitBtnStyle()).toEqual({});
  });

  // ─── ngOnInit buildForm + submit regular form ──────────────────────────────

  it('submit deve exibir aviso quando form é inválido (campo required vazio)', () => {
    const { component, messageMock } = createSuite();
    component.ngOnInit();
    component.submit();
    expect(messageMock.warning).toHaveBeenCalled();
  });

  it('submit deve chamar submitForm quando form é válido', () => {
    const { component, templateServiceMock, messageMock } = createSuite();
    component.ngOnInit();
    // Preenche o campo obrigatório
    component.form.get('field_0')?.setValue('João Silva');
    component.submit();
    expect(templateServiceMock.submitForm).toHaveBeenCalled();
    expect(messageMock.success).toHaveBeenCalled();
  });

  it('submit deve mostrar erro quando submitForm falha', () => {
    const { component, templateServiceMock, messageMock } = createSuite();
    templateServiceMock.submitForm.mockReturnValue(throwError(() => new Error('err')));
    component.ngOnInit();
    component.form.get('field_0')?.setValue('João Silva');
    component.submit();
    expect(messageMock.error).toHaveBeenCalled();
  });

  // ─── submit (agendamento) ──────────────────────────────────────────────────

  it('submit de agendamento deve avisar se data não selecionada', () => {
    const { component, messageMock } = createSuite('form-agenda', mockScheduledTemplate);
    component.ngOnInit();
    component.submit();
    expect(messageMock.warning).toHaveBeenCalledWith(expect.stringContaining('data'));
  });

  it('submit de agendamento deve avisar se slot não selecionado', () => {
    const { component, messageMock } = createSuite('form-agenda', mockScheduledTemplate);
    component.ngOnInit();
    component.selectedDate.set('2024-06-15');
    component.submit();
    expect(messageMock.warning).toHaveBeenCalledWith(expect.stringContaining('horário'));
  });

  it('submit de agendamento deve chamar bookAppointment quando tudo preenchido', () => {
    const { component, templateServiceMock, messageMock } = createSuite('form-agenda', mockScheduledTemplate);
    component.ngOnInit();
    component.selectedDate.set('2024-06-15');
    component.selectedSlot.set('10:00:00');
    component.form.get('field_0')?.setValue('João Silva');
    component.submit();
    expect(templateServiceMock.bookAppointment).toHaveBeenCalled();
    expect(messageMock.success).toHaveBeenCalled();
  });

  it('submit de agendamento deve tratar erro', () => {
    const { component, templateServiceMock, messageMock } = createSuite('form-agenda', mockScheduledTemplate);
    templateServiceMock.bookAppointment.mockReturnValue(throwError(() => ({
      error: { message: 'Horário lotado' },
    })));
    component.ngOnInit();
    component.selectedDate.set('2024-06-15');
    component.selectedSlot.set('10:00:00');
    component.form.get('field_0')?.setValue('João');
    component.submit();
    expect(messageMock.error).toHaveBeenCalled();
  });

  // ─── onDateChange ──────────────────────────────────────────────────────────

  it('onDateChange deve carregar slots disponíveis quando data é selecionada', () => {
    const { component, templateServiceMock } = createSuite();
    const slots = [{ time: '10:00:00', available: true }];
    templateServiceMock.getAvailableSlots.mockReturnValue(of({ slots }));
    component.ngOnInit();
    const event = { target: { value: '2024-06-15' } } as unknown as Event;
    component.onDateChange(event);
    expect(templateServiceMock.getAvailableSlots).toHaveBeenCalled();
    expect(component.availableSlots()).toEqual(slots);
  });

  it('onDateChange deve limpar data quando valor é vazio', () => {
    const { component } = createSuite();
    component.ngOnInit();
    const event = { target: { value: '' } } as unknown as Event;
    component.onDateChange(event);
    expect(component.selectedDate()).toBe('');
  });

  it('onDateChange deve tratar erro ao carregar slots', () => {
    const { component, templateServiceMock, messageMock } = createSuite();
    templateServiceMock.getAvailableSlots.mockReturnValue(throwError(() => new Error('err')));
    component.ngOnInit();
    const event = { target: { value: '2024-06-15' } } as unknown as Event;
    component.onDateChange(event);
    expect(messageMock.error).toHaveBeenCalled();
    expect(component.loadingSlots()).toBe(false);
  });

  // ─── getControl ────────────────────────────────────────────────────────────

  it('getControl deve retornar o FormControl do campo pelo índice', () => {
    const { component } = createSuite();
    component.ngOnInit();
    const ctrl = component.getControl(0);
    expect(ctrl).toBeTruthy();
  });
});
