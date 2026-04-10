import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  FormTemplateService,
  FormTemplate,
  CreateFormTemplateRequest,
  UpdateFormTemplateRequest,
  CreateFormSubmissionRequest,
  BookAppointmentRequest,
  MarkAttendanceRequest,
  ImportAttendanceRequest,
} from './form-template.service';
import { PageResponse } from '../models/page-response.model';
import { environment } from '../../../environments/environment';

describe('FormTemplateService', () => {
  let service: FormTemplateService;
  let httpMock: HttpTestingController;

  const templatesUrl = `${environment.apiUrl}/form-templates`;
  const submissionsUrl = `${environment.apiUrl}/form-submissions`;
  const appointmentsUrl = `${environment.apiUrl}/appointments`;
  const attendanceUrl = `${environment.apiUrl}/attendance`;
  const uploadsUrl = `${environment.apiUrl}/uploads`;

  const mockTemplate: FormTemplate = {
    id: 1,
    name: 'Formulário Teste',
    slug: 'formulario-teste',
    clientName: 'Cliente A',
    fields: [{ id: 1, label: 'Nome', type: 'text', required: true }],
    hasSchedule: false,
    hasAttendance: false,
    scheduleConfig: null,
    appearance: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormTemplateService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FormTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  // ─── Image Upload ────────────────────────────────────────────────────────────

  it('uploadImage deve fazer POST com FormData', () => {
    const file = new File(['content'], 'imagem.png', { type: 'image/png' });

    service.uploadImage(file).subscribe((res) => {
      expect(res.url).toBe('https://cdn.example.com/imagem.png');
    });

    const req = httpMock.expectOne(`${uploadsUrl}/image`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    req.flush({ url: 'https://cdn.example.com/imagem.png' });
  });

  it('deleteImage deve fazer DELETE com a URL no body', () => {
    service.deleteImage('https://cdn.example.com/img.png').subscribe();

    const req = httpMock.expectOne(`${uploadsUrl}/image`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ url: 'https://cdn.example.com/img.png' });
    req.flush(null);
  });

  // ─── Templates ───────────────────────────────────────────────────────────────

  it('createTemplate deve fazer POST para o endpoint correto', () => {
    const payload: CreateFormTemplateRequest = {
      name: 'Novo Template',
      clientId: 1,
      fields: [{ label: 'Nome', type: 'text', required: true, colSpan: 2 }],
    };

    service.createTemplate(1, payload).subscribe((t) => expect(t.id).toBe(1));

    const req = httpMock.expectOne(`${templatesUrl}/create/1`);
    expect(req.request.method).toBe('POST');
    req.flush(mockTemplate);
  });

  it('updateTemplate deve fazer PUT com o payload correto', () => {
    const payload: UpdateFormTemplateRequest = {
      name: 'Template Editado',
      fields: [{ label: 'Nome', type: 'text', required: true, colSpan: 2 }],
    };

    service.updateTemplate(1, payload).subscribe();

    const req = httpMock.expectOne(`${templatesUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush(mockTemplate);
  });

  it('deleteTemplate deve fazer DELETE para o template correto', () => {
    service.deleteTemplate(1).subscribe();

    const req = httpMock.expectOne(`${templatesUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getAllTemplates deve fazer GET com paginação padrão', () => {
    const mockPage: PageResponse<FormTemplate> = {
      content: [mockTemplate],
      totalPages: 1,
      totalElements: 1,
      number: 0,
      size: 20,
      first: true,
      last: true,
    };

    service.getAllTemplates().subscribe((page) => {
      expect(page.content).toHaveLength(1);
    });

    const req = httpMock.expectOne(`${templatesUrl}?page=0&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('getTemplateBySlug deve fazer GET pelo slug', () => {
    service.getTemplateBySlug('formulario-teste').subscribe((t) => {
      expect(t.slug).toBe('formulario-teste');
    });

    const req = httpMock.expectOne(`${templatesUrl}/slug/formulario-teste`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTemplate);
  });

  it('getMyTemplates deve fazer GET no endpoint de templates do usuário', () => {
    service.getMyTemplates().subscribe();

    const req = httpMock.expectOne(`${templatesUrl}/my-templates?page=0&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalPages: 0, totalElements: 0, number: 0, size: 20, first: true, last: true });
  });

  // ─── Submissions ─────────────────────────────────────────────────────────────

  it('submitForm deve fazer POST com o payload correto', () => {
    const payload: CreateFormSubmissionRequest = {
      templateId: 1,
      values: { Nome: 'João', Email: 'joao@email.com' },
    };

    service.submitForm(payload).subscribe();

    const req = httpMock.expectOne(submissionsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, templateId: 1, values: payload.values, createdAt: '2024-01-01' });
  });

  it('getSubmissionsByTemplate deve fazer GET com templateId e paginação', () => {
    service.getSubmissionsByTemplate(1).subscribe();

    const req = httpMock.expectOne(`${submissionsUrl}/template/1?page=0&size=500`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalPages: 0, totalElements: 0, number: 0, size: 500, first: true, last: true });
  });

  it('getSubmissionsBySlug deve fazer GET pelo slug', () => {
    service.getSubmissionsBySlug('formulario-teste').subscribe();

    const req = httpMock.expectOne(`${submissionsUrl}/slug/formulario-teste`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('deleteSubmission deve fazer DELETE pelo ID da submissão', () => {
    service.deleteSubmission(10).subscribe();

    const req = httpMock.expectOne(`${submissionsUrl}/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ─── Agendamentos ────────────────────────────────────────────────────────────

  it('getAvailableSlots deve fazer GET com templateId e data', () => {
    service.getAvailableSlots(1, '2024-06-15').subscribe();

    const req = httpMock.expectOne(`${appointmentsUrl}/template/1/slots?date=2024-06-15`);
    expect(req.request.method).toBe('GET');
    req.flush({ date: '2024-06-15', slots: [] });
  });

  it('bookAppointment deve fazer POST com os dados de agendamento', () => {
    const payload: BookAppointmentRequest = {
      templateId: 1,
      slotDate: '2024-06-15',
      slotTime: '10:00:00',
      bookedByName: 'João',
      bookedByContact: '11999999999',
      extraValues: {},
    };

    service.bookAppointment(payload).subscribe();

    const req = httpMock.expectOne(`${appointmentsUrl}/book`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, status: 'AGENDADO', ...payload });
  });

  it('cancelAppointment deve fazer PATCH no endpoint de cancelamento', () => {
    service.cancelAppointment(5).subscribe();

    const req = httpMock.expectOne(`${appointmentsUrl}/5/cancel`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 5, status: 'CANCELADO' });
  });

  it('getAppointmentsByTemplate deve fazer GET com paginação', () => {
    service.getAppointmentsByTemplate(1).subscribe();

    const req = httpMock.expectOne(`${appointmentsUrl}/template/1?page=0&size=500`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalPages: 0, totalElements: 0, number: 0, size: 500, first: true, last: true });
  });

  // ─── Attendance ───────────────────────────────────────────────────────────────

  it('importAttendance deve fazer POST com a lista de registros', () => {
    const payload: ImportAttendanceRequest = {
      rows: [{ Nome: 'Maria', CPF: '12345678901' }],
    };

    service.importAttendance(1, payload).subscribe();

    const req = httpMock.expectOne(`${attendanceUrl}/template/1/import`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush([]);
  });

  it('getAttendance deve fazer GET com paginação', () => {
    service.getAttendance(1).subscribe();

    const req = httpMock.expectOne(`${attendanceUrl}/template/1?page=0&size=500`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalPages: 0, totalElements: 0, number: 0, size: 500, first: true, last: true });
  });

  it('markAttendance deve fazer PATCH com o payload correto', () => {
    const payload: MarkAttendanceRequest = { attended: true, notes: 'Presente' };

    service.markAttendance(3, payload).subscribe();

    const req = httpMock.expectOne(`${attendanceUrl}/3/mark`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 3, attended: true, notes: 'Presente' });
  });

  it('deleteAttendanceRecord deve fazer DELETE pelo ID do registro', () => {
    service.deleteAttendanceRecord(7).subscribe();

    const req = httpMock.expectOne(`${attendanceUrl}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getAttendanceExistence deve fazer GET com query params de templateIds', () => {
    service.getAttendanceExistence([1, 2, 3]).subscribe();

    const req = httpMock.expectOne((r) =>
      r.url === `${attendanceUrl}/template/existence` &&
      r.params.getAll('templateIds')?.join(',') === '1,2,3',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ 1: true, 2: false, 3: true });
  });

  it('updateAttendanceRowData deve fazer PATCH com os dados da linha', () => {
    const rowData = { Nome: 'Maria Atualizada' };

    service.updateAttendanceRowData(3, rowData).subscribe();

    const req = httpMock.expectOne(`${attendanceUrl}/3/data`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(rowData);
    req.flush({ id: 3, rowData });
  });

  it('updateScheduleConfig deve fazer PATCH no endpoint de schedule-config', () => {
    const config = {
      startTime: '08:00:00',
      endTime: '18:00:00',
      slotDurationMinutes: 30,
      maxDaysAhead: 30,
      slotCapacity: 1,
      dedupFields: ['CPF'],
    };

    service.updateScheduleConfig(1, config).subscribe();

    const req = httpMock.expectOne(`${templatesUrl}/1/schedule-config`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(config);
    req.flush(mockTemplate);
  });
});
