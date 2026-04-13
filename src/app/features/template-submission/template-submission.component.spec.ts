import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { TemplateSubmissionComponent } from './template-submission.component';
import { FormTemplateService } from '../../core/services/form-template.service';
import { MessageService } from '../../core/services/message.service';

function createSuite(slug: string | null = 'test-slug') {
  const formTemplateServiceMock = {
    getTemplateBySlug: vi.fn(),
    getSubmissionsByTemplate: vi.fn(),
    deleteSubmission: vi.fn(),
  };

  const activatedRouteMock = {
    snapshot: {
      paramMap: {
        get: vi.fn().mockReturnValue(slug),
      },
    },
  };

  const messageMock = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  TestBed.resetTestingModule();

  TestBed.configureTestingModule({
    imports: [TemplateSubmissionComponent],
    providers: [
      provideRouter([]),

      { provide: FormTemplateService, useValue: formTemplateServiceMock },
      { provide: ActivatedRoute, useValue: activatedRouteMock },

      // 🔥 ESSENCIAL (resolve ToastConfig error)
      { provide: MessageService, useValue: messageMock },
    ],
  });

  const fixture = TestBed.createComponent(TemplateSubmissionComponent);
  const component = fixture.componentInstance;

  return {
    fixture,
    component,
    formTemplateServiceMock,
    activatedRouteMock,
    messageMock,
  };
}

describe('TemplateSubmissionComponent', () => {
  it('deve ser criado', () => {
    const { component } = createSuite();
    expect(component).toBeTruthy();
  });

  it('ngOnInit deve carregar template e submissões', () => {
    const { component, formTemplateServiceMock } = createSuite();

    formTemplateServiceMock.getTemplateBySlug.mockReturnValue(
      of({ id: 1, name: 'Template' })
    );

    formTemplateServiceMock.getSubmissionsByTemplate.mockReturnValue(
      of({ content: [{ id: 1 }] })
    );

    component.ngOnInit();

    expect(formTemplateServiceMock.getTemplateBySlug).toHaveBeenCalled();
  });

  it('ngOnInit deve definir loading como false quando slug é null', () => {
    const { component } = createSuite(null);

    component.ngOnInit();

    expect(component.loading()).toBe(false);
  });

  it('ngOnInit deve tratar erro de template', () => {
    const { component, formTemplateServiceMock } = createSuite();

    formTemplateServiceMock.getTemplateBySlug.mockReturnValue(
      throwError(() => new Error('error'))
    );

    component.ngOnInit();

    expect(component.loading()).toBe(false);
  });

  it('ngOnInit deve tratar erro de submissions', () => {
    const { component, formTemplateServiceMock } = createSuite();

    formTemplateServiceMock.getTemplateBySlug.mockReturnValue(
      of({ id: 1 })
    );

    formTemplateServiceMock.getSubmissionsByTemplate.mockReturnValue(
      throwError(() => new Error('error'))
    );

    component.ngOnInit();

    expect(component.loading()).toBe(false);
  });
});