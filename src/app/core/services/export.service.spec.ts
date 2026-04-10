import { TestBed } from '@angular/core/testing';
import * as XLSX from 'xlsx';
import { ExportService } from './export.service';
import { FormSubmission, AppointmentResponse, AttendanceRecord } from './form-template.service';
import { DashboardSummary } from './dashboard.service';

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({ Sheets: {}, SheetNames: [] }),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ExportService] });
    service = TestBed.inject(ExportService);
    vi.clearAllMocks();
    // Repõe implementações padrão após clearAllMocks
    vi.mocked(XLSX.utils.book_new).mockReturnValue({ Sheets: {}, SheetNames: [] } as XLSX.WorkBook);
    vi.mocked(XLSX.utils.json_to_sheet).mockReturnValue({} as XLSX.WorkSheet);
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  // ─── exportSubmissions ────────────────────────────────────────────────────

  describe('exportSubmissions', () => {
    const mockSubmissions: FormSubmission[] = [
      { id: 1, templateId: 1, values: { nome: 'João', email: 'joao@email.com' }, createdAt: '2024-01-15T10:00:00' },
      { id: 2, templateId: 1, values: { nome: 'Maria', email: 'maria@email.com' }, createdAt: '2024-01-16T11:00:00' },
    ];

    it('deve chamar XLSX.writeFile com nome correto', () => {
      service.exportSubmissions(mockSubmissions, 'Formulario Teste');
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        'respostas_formulario_teste.xlsx',
      );
    });

    it('não deve chamar XLSX.writeFile quando lista está vazia', () => {
      service.exportSubmissions([], 'Template');
      expect(XLSX.writeFile).not.toHaveBeenCalled();
    });

    it('deve gerar colunas a partir dos valores das submissões', () => {
      service.exportSubmissions(mockSubmissions, 'Teste');

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
      expect(rows[0]).toHaveProperty('ID', '1');
      expect(rows[0]).toHaveProperty('Nome');
      expect(rows[0]).toHaveProperty('Email');
    });

    it('deve lidar com valores nulos nas submissões', () => {
      const submissionsWithNull: FormSubmission[] = [
        { id: 1, templateId: 1, values: { nome: 'João' }, createdAt: '2024-01-15T10:00:00' },
        { id: 2, templateId: 1, values: {}, createdAt: '2024-01-16T11:00:00' },
      ];
      expect(() => service.exportSubmissions(submissionsWithNull, 'Teste')).not.toThrow();
    });

    it('deve formatar o nome do arquivo retirando caracteres especiais', () => {
      service.exportSubmissions(mockSubmissions, 'Formulário com Acento!');
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/^respostas_/),
      );
    });
  });

  // ─── exportAppointments ───────────────────────────────────────────────────

  describe('exportAppointments', () => {
    const mockAppointments: AppointmentResponse[] = [
      {
        id: 1,
        templateId: 1,
        templateName: 'Agenda',
        slotDate: '2024-06-15',
        slotTime: '10:00:00',
        status: 'AGENDADO',
        bookedByName: 'João',
        bookedByContact: '11999',
        cancelledBy: null,
        cancelledAt: null,
        extraValues: { cpf: '12345678901' },
        createdAt: '2024-06-01T09:00:00',
      },
      {
        id: 2,
        templateId: 1,
        templateName: 'Agenda',
        slotDate: '2024-06-16',
        slotTime: '11:00:00',
        status: 'CANCELADO',
        bookedByName: 'Maria',
        bookedByContact: '22999',
        cancelledBy: 'Admin',
        cancelledAt: '2024-06-10T08:00:00',
        extraValues: {},
        createdAt: '2024-06-02T09:00:00',
      },
    ];

    it('deve chamar XLSX.writeFile com nome de agendamentos', () => {
      service.exportAppointments(mockAppointments, 'Agenda Teste');
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        'agendamentos_agenda_teste.xlsx',
      );
    });

    it('não deve exportar lista vazia', () => {
      service.exportAppointments([], 'Agenda');
      expect(XLSX.writeFile).not.toHaveBeenCalled();
    });

    it('deve mapear status AGENDADO para "Confirmado"', () => {
      service.exportAppointments([mockAppointments[0]], 'Teste');

      const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
      expect(rows[0]['Status']).toBe('Confirmado');
    });

    it('deve mapear status CANCELADO para "Cancelado"', () => {
      service.exportAppointments([mockAppointments[1]], 'Teste');

      const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
      expect(rows[0]['Status']).toBe('Cancelado');
    });

    it('deve incluir colunas extras do extraValues', () => {
      service.exportAppointments(mockAppointments, 'Teste');

      const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
      expect(rows[0]).toHaveProperty('Cpf');
    });
  });

  // ─── exportAttendance ─────────────────────────────────────────────────────

  describe('exportAttendance', () => {
    const mockRecords: AttendanceRecord[] = [
      {
        id: 1, templateId: 1,
        rowData: { nome: 'João', cpf: '111' },
        attended: true, attendedAt: '2024-06-15T10:00:00',
        notes: 'Presente', rowOrder: 1, createdAt: '2024-06-01',
      },
      {
        id: 2, templateId: 1,
        rowData: { nome: 'Maria', cpf: '222' },
        attended: false, attendedAt: null,
        notes: null, rowOrder: 2, createdAt: '2024-06-01',
      },
    ];

    it('deve chamar XLSX.writeFile com nome de presença', () => {
      service.exportAttendance(mockRecords, 'Lista Teste');
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        'presenca_lista_teste.xlsx',
      );
    });

    it('não deve exportar lista vazia', () => {
      service.exportAttendance([], 'Lista');
      expect(XLSX.writeFile).not.toHaveBeenCalled();
    });

    it('deve marcar "Sim" para presentes e "Não" para ausentes', () => {
      service.exportAttendance(mockRecords, 'Teste');

      const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
      expect(rows[0]['Presente']).toBe('Sim');
      expect(rows[1]['Presente']).toBe('Não');
    });

    it('deve usar templateFieldLabels para ordenar colunas', () => {
      service.exportAttendance(mockRecords, 'Teste', ['cpf', 'nome']);

      const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
      const keys = Object.keys(rows[0]);
      // cpf deve aparecer antes de nome conforme a ordem de templateFieldLabels
      expect(keys.indexOf('Cpf')).toBeLessThan(keys.indexOf('Nome'));
    });
  });

  // ─── exportDashboard ──────────────────────────────────────────────────────

  describe('exportDashboard', () => {
    const mockSummary: DashboardSummary = {
      totalTemplates: 5, totalClients: 10, totalSubmissions: 100,
      totalAppointments: 50, confirmedAppointments: 40, cancelledAppointments: 10,
      totalAttendanceRecords: 200, presentAttendanceRecords: 180,
      formTemplateCount: 3, appointmentTemplateCount: 1, attendanceTemplateCount: 1,
      templates: [
        {
          id: 1, name: 'Form A', slug: 'form-a', clientName: 'Cliente X',
          hasSchedule: false, fieldCount: 3, submissionCount: 50,
          appointmentTotal: 0, appointmentConfirmed: 0, attendanceTotal: 0,
          attendancePresent: 0, appointmentCancelled: 0,
        },
      ],
      page: 0, size: 10, totalElements: 5, totalPages: 1,
      globalTotalSubmissions: 100, globalTotalAppointments: 50,
      globalConfirmedAppointments: 40, globalCancelledAppointments: 10,
      globalTotalAttendanceRecords: 200, globalPresentAttendanceRecords: 180,
    };

    it('deve chamar XLSX.writeFile com nome dashboard_', () => {
      service.exportDashboard(mockSummary);
      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/^dashboard_\d{8}\.xlsx$/),
      );
    });

    it('deve incluir aba de resumo e aba por formulário', () => {
      service.exportDashboard(mockSummary);

      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2);
      expect(vi.mocked(XLSX.utils.book_append_sheet).mock.calls[0][2]).toBe('Resumo');
      expect(vi.mocked(XLSX.utils.book_append_sheet).mock.calls[1][2]).toBe('Por Formulário');
    });

    it('não deve criar aba Por Formulário quando templates está vazio', () => {
      const summaryNoTemplates = { ...mockSummary, templates: [] };
      service.exportDashboard(summaryNoTemplates);

      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(1);
    });
  });

  // ─── readExcelFile ────────────────────────────────────────────────────────

  describe('readExcelFile', () => {
    it('deve rejeitar com mensagem de erro quando FileReader falha', async () => {
      const file = new File(['conteudo'], 'test.xlsx');

      // Simula erro do FileReader usando função construtora (evita limitações de arrow function)
      const MockFR: any = function(this: any) {
        const self = this;
        this.onerror = null;
        this.readAsArrayBuffer = function() { setTimeout(() => self.onerror?.(), 0); };
      };
      const fileReaderSpy = vi.spyOn(window, 'FileReader').mockImplementation(MockFR);

      await expect(service.readExcelFile(file)).rejects.toThrow('Erro ao ler arquivo');
      fileReaderSpy.mockRestore();
    });
  });
});
