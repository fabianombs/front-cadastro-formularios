import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Estatísticas de um template individual exibidas no dashboard. */
export interface TemplateStatResponse {
  id: number;
  name: string;
  slug: string;
  clientName?: string;
  hasSchedule?: boolean;
  fieldCount: number;
  submissionCount: number;
  appointmentTotal: number;
  appointmentConfirmed: number;
  attendanceTotal: number;
  attendancePresent: number;
  /** Classificação do template: formulário simples, agendamento ou lista de presença. */
  type?: 'formulario' | 'agendamento' | 'lista-presenca';
  appointmentCancelled?: number;
}

/**
 * Resumo completo do dashboard com KPIs globais e lista paginada de templates.
 *
 * Os campos prefixados com `global` representam totais absolutos da plataforma,
 * independentemente da página atual (usados nos cards de KPI).
 */
export interface DashboardSummary {
  totalTemplates: number;
  totalClients: number;
  totalSubmissions: number;
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  totalAttendanceRecords: number;
  presentAttendanceRecords: number;
  formTemplateCount: number;
  appointmentTemplateCount: number;
  attendanceTemplateCount: number;
  /** Lista paginada de templates com suas estatísticas individuais. */
  templates: TemplateStatResponse[];
  /** Metadados de paginação do Spring Page. */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  /** Total global de submissões (para KPIs, independe da paginação). */
  globalTotalSubmissions: number;
  globalTotalAppointments: number;
  globalConfirmedAppointments: number;
  globalCancelledAppointments: number;
  globalTotalAttendanceRecords: number;
  globalPresentAttendanceRecords: number;
}

/**
 * Serviço responsável por buscar os dados do painel principal (dashboard).
 *
 * Consome o endpoint `/api/dashboard` que retorna KPIs agregados e a lista
 * paginada de templates com suas respectivas estatísticas.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly base = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  /**
   * Retorna o resumo completo do dashboard com KPIs e templates paginados.
   *
   * @param page - Página da lista de templates (0-based, padrão: 0)
   * @param size - Quantidade de templates por página (padrão: 10)
   * @returns Observable com `DashboardSummary` contendo KPIs globais e templates
   */
  getSummary(page = 0, size = 10): Observable<DashboardSummary> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<DashboardSummary>(this.base, { params });
  }
}
