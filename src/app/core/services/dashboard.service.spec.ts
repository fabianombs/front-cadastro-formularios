import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DashboardService, DashboardSummary } from './dashboard.service';
import { environment } from '../../../environments/environment';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/dashboard`;

  const mockSummary: DashboardSummary = {
    totalTemplates: 5,
    totalClients: 10,
    totalSubmissions: 100,
    totalAppointments: 50,
    confirmedAppointments: 40,
    cancelledAppointments: 10,
    totalAttendanceRecords: 200,
    presentAttendanceRecords: 180,
    formTemplateCount: 3,
    appointmentTemplateCount: 1,
    attendanceTemplateCount: 1,
    templates: [],
    page: 0,
    size: 10,
    totalElements: 5,
    totalPages: 1,
    globalTotalSubmissions: 100,
    globalTotalAppointments: 50,
    globalConfirmedAppointments: 40,
    globalCancelledAppointments: 10,
    globalTotalAttendanceRecords: 200,
    globalPresentAttendanceRecords: 180,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  // ─── getSummary ─────────────────────────────────────────────────────────────

  it('getSummary deve fazer GET com parâmetros padrão (page=0, size=10)', () => {
    service.getSummary().subscribe((data) => {
      expect(data.totalTemplates).toBe(5);
      expect(data.globalTotalSubmissions).toBe(100);
    });

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush(mockSummary);
  });

  it('getSummary deve usar os parâmetros de página informados', () => {
    service.getSummary(2, 5).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('5');
    req.flush(mockSummary);
  });

  it('getSummary deve retornar a resposta completa do servidor', () => {
    let result: DashboardSummary | undefined;
    service.getSummary().subscribe((data) => (result = data));

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    req.flush(mockSummary);

    expect(result).toEqual(mockSummary);
  });
});
