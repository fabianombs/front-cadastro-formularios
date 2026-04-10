import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TemplateSubmissionComponent } from './template-submission.component';
import { FormTemplateService, FormTemplate, FormSubmission } from '../../core/services/form-template.service';

const mockTemplate: FormTemplate = {
  id: 1,
  name: 'Formulário Teste',
  slug: 'formulario-teste',
  fields: [{ id: 1, label: 'Nome', type: 'text', required: true }],
  clientName: '',
  hasSchedule: false,
  hasAttendance: false,
  scheduleConfig: null,
};

const mockSubmissions: FormSubmission[] = [
  { id: 1, templateId: 1, values: { nome: 'João' }, createdAt: '2024-01-10T10:00:00' },
];

function createSuite(slug: string | null = 'formulario-teste-list') {
  const templateServiceMock = {
    getTemplateBySlug: vi.fn().mockReturnValue(of(mockTemplate)),
    getSubmissionsByTemplate: vi.fn().mockReturnValue(of({ content: mockSubmissions })),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TemplateSubmissionComponent],
    providers: [
      provideRouter([]),
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
      { provide: FormTemplateService, useValue: templateServiceMock },
    ],
  });

  const fixture = TestBed.createComponent(TemplateSubmissionComponent);
  const component = fixture.componentInstance;
  return { fixture, component, templateServiceMock };
}

describe('TemplateSubmissionComponent', () => {
  it('deve ser criado', () => {
    const { component } = createSuite();
    expect(component).toBeTruthy();
  });

  // ─── ngOnInit com slug ─────────────────────────────────────────────────────

  it('ngOnInit deve remover sufixo -list do slug', () => {
    const { component, templateServiceMock } = createSuite('formulario-teste-list');
    component.ngOnInit();
    expect(templateServiceMock.getTemplateBySlug).toHaveBeenCalledWith('formulario-teste');
  });

  it('ngOnInit deve carregar template e submissões', () => {
    const { component } = createSuite('formulario-teste-list');
    component.ngOnInit();
    expect(component.template()).toEqual(mockTemplate);
    expect(component.submissions()).toHaveLength(1);
    expect(component.loading()).toBe(false);
  });

  // ─── ngOnInit sem slug ─────────────────────────────────────────────────────

  it('ngOnInit deve definir loading como false quando slug é null', () => {
    const { component, templateServiceMock } = createSuite(null);
    component.ngOnInit();
    expect(templateServiceMock.getTemplateBySlug).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  // ─── erro ao carregar template ─────────────────────────────────────────────

  it('ngOnInit deve definir loading como false quando getTemplateBySlug falha', () => {
    const { component, templateServiceMock } = createSuite('form-list');
    templateServiceMock.getTemplateBySlug.mockReturnValue(throwError(() => new Error('err')));
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.template()).toBeNull();
  });

  // ─── erro ao carregar submissões ───────────────────────────────────────────

  it('ngOnInit deve definir loading como false quando getSubmissionsByTemplate falha', () => {
    const { component, templateServiceMock } = createSuite('form-list');
    templateServiceMock.getSubmissionsByTemplate.mockReturnValue(throwError(() => new Error('err')));
    component.ngOnInit();
    expect(component.loading()).toBe(false);
  });
});
