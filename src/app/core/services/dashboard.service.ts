import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TemplateStatResponse {
  id: number;
  name: string;
  clientName?: string;
  submissionCount: number;
  appointmentTotal: number;
  appointmentConfirmed: number;
  attendanceTotal: number;
  attendancePresent: number;
  type?: 'formulario' | 'agendamento' | 'lista-presenca';
  hasSchedule?: boolean;
  appointmentCancelled?: number;
}

export interface DashboardSummary {
  totalTemplates: number;
  totalClients: number;
  totalSubmissions: number;
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  totalAttendanceRecords: number;
  presentAttendanceRecords: number;
  templates: TemplateStatResponse[];
  // metadados de paginação do Spring Page
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {

  private readonly base = 'http://localhost:8080/dashboard';

  constructor(private http: HttpClient) { }

  getSummary(page = 0, size = 10): Observable<DashboardSummary> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get<DashboardSummary>(this.base, { params });
  }
}
