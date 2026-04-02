// src/app/core/services/form-template.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { PageResponse } from '../models/page-response.model';
import { environment } from '../../../environments/environment';

export interface TemplateAppearance {
  backgroundColor?: string;
  backgroundGradient?: string;
  backgroundImageUrl?: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
  primaryColor?: string;
  formTextColor?: string;
  fieldBackgroundColor?: string;
  fieldTextColor?: string;
  /** Cor de fundo dos cards, tabelas e área de filtros */
  cardBackgroundColor?: string;
  /** Cor da borda dos cards e tabelas */
  cardBorderColor?: string;
}

export interface FormField {
  label: string;
  type: string;
  id: number;
  required: boolean;
  fieldColor?: string;
  /** 2 = largura total, 1 = meia largura */
  colSpan?: number;
}

export interface ScheduleConfig {
  startTime: string; // "HH:mm:ss"
  endTime: string;
  slotDurationMinutes: number;
  maxDaysAhead: number;
}

export interface FormTemplate {
  id: number;
  name: string;
  slug: string;
  clientName: string;
  fields: FormField[];
  hasSchedule: boolean;
  hasAttendance: boolean;
  scheduleConfig: ScheduleConfig | null;
  appearance?: TemplateAppearance | null;
}

export interface CreateFormTemplateRequest {
  name: string;
  clientId: number;
  fields: Omit<FormField, 'id'>[];
  scheduleConfig?: ScheduleConfig | null;
  appearance?: TemplateAppearance | null;
}

export interface FormSubmission {
  id: number;
  templateId: number;
  values: { [key: string]: string };
  createdAt: string;
}

export interface CreateFormSubmissionRequest {
  templateId: number;
  values: { [key: string]: string };
}

// ===== AGENDAMENTO =====

export interface SlotInfo {
  time: string; // "HH:mm:ss"
  available: boolean;
}

export interface AvailableSlotsResponse {
  date: string; // "YYYY-MM-DD"
  slots: SlotInfo[];
}

export interface BookAppointmentRequest {
  templateId: number;
  slotDate: string; // "YYYY-MM-DD"
  slotTime: string; // "HH:mm:ss"
  bookedByName: string;
  bookedByContact: string;
  extraValues: { [key: string]: string };
}

// ===== LISTA DE PRESENÇA =====

export interface AttendanceRecord {
  id: number;
  templateId: number;
  rowData: { [key: string]: string };
  attended: boolean;
  attendedAt: string | null;
  notes: string | null;
  rowOrder: number;
  createdAt: string;
}

export interface ImportAttendanceRequest {
  rows: { [key: string]: string }[];
}

export interface MarkAttendanceRequest {
  attended: boolean;
  notes: string | null;
}

export interface AppointmentResponse {
  id: number;
  templateId: number;
  templateName: string;
  slotDate: string;
  slotTime: string;
  status: 'AGENDADO' | 'CANCELADO';
  bookedByName: string;
  bookedByContact: string;
  cancelledBy: string | null;
  cancelledAt: string | null;
  extraValues: { [key: string]: string };
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FormTemplateService {
  private apiUrl = `${environment.apiUrl}/form-templates`;
  private submissionsUrl = `${environment.apiUrl}/form-submissions`;
  private appointmentsUrl = `${environment.apiUrl}/appointments`;
  private attendanceUrl = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  // ================= TEMPLATES =================

  createTemplate(clientId: number, payload: CreateFormTemplateRequest): Observable<FormTemplate> {
    return this.http.post<FormTemplate>(`${this.apiUrl}/create/${clientId}`, payload);
  }

  getAllTemplates(page = 0, size = 20): Observable<PageResponse<FormTemplate>> {
    return this.http.get<PageResponse<FormTemplate>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  getMyTemplates(page = 0, size = 20): Observable<PageResponse<FormTemplate>> {
    return this.http
      .get<PageResponse<FormTemplate>>(`${this.apiUrl}/my-templates?page=${page}&size=${size}`)
      .pipe(tap((res) => console.log('TEMPLATES DO USUÁRIO:', res)));
  }

  getTemplateBySlug(slug: string): Observable<FormTemplate> {
    return this.http.get<FormTemplate>(`${this.apiUrl}/slug/${slug}`);
  }

  // ================= SUBMISSIONS =================

  submitForm(payload: CreateFormSubmissionRequest): Observable<FormSubmission> {
    return this.http.post<FormSubmission>(this.submissionsUrl, payload);
  }

  getSubmissionsByTemplate(
    templateId: number,
    page = 0,
    size = 500,
  ): Observable<PageResponse<FormSubmission>> {
    return this.http.get<PageResponse<FormSubmission>>(
      `${this.submissionsUrl}/template/${templateId}?page=${page}&size=${size}`,
    );
  }

  getSubmissionsBySlug(slug: string): Observable<FormSubmission[]> {
    return this.http.get<FormSubmission[]>(`${this.submissionsUrl}/slug/${slug}`);
  }

  // ================= AGENDAMENTOS =================

  getAvailableSlots(templateId: number, date: string): Observable<AvailableSlotsResponse> {
    return this.http.get<AvailableSlotsResponse>(
      `${this.appointmentsUrl}/template/${templateId}/slots?date=${date}`,
    );
  }

  getAvailableSlotsRange(
    templateId: number,
    from: string,
    to: string,
  ): Observable<AvailableSlotsResponse[]> {
    return this.http.get<AvailableSlotsResponse[]>(
      `${this.appointmentsUrl}/template/${templateId}/slots/range?from=${from}&to=${to}`,
    );
  }

  bookAppointment(payload: BookAppointmentRequest): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${this.appointmentsUrl}/book`, payload);
  }

  cancelAppointment(appointmentId: number): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(
      `${this.appointmentsUrl}/${appointmentId}/cancel`,
      {},
    );
  }

  deleteSubmission(submissionId: number): Observable<void> {
    return this.http.delete<void>(`${this.submissionsUrl}/${submissionId}`);
  }

  getAppointmentsByTemplate(
    templateId: number,
    page = 0,
    size = 500,
  ): Observable<PageResponse<AppointmentResponse>> {
    return this.http.get<PageResponse<AppointmentResponse>>(
      `${this.appointmentsUrl}/template/${templateId}?page=${page}&size=${size}`,
    );
  }

  // ================= ATTENDANCE =================

  importAttendance(
    templateId: number,
    payload: ImportAttendanceRequest,
  ): Observable<AttendanceRecord[]> {
    return this.http.post<AttendanceRecord[]>(
      `${this.attendanceUrl}/template/${templateId}/import`,
      payload,
    );
  }

  getAttendance(
    templateId: number,
    page = 0,
    size = 500,
  ): Observable<PageResponse<AttendanceRecord>> {
    return this.http.get<PageResponse<AttendanceRecord>>(
      `${this.attendanceUrl}/template/${templateId}?page=${page}&size=${size}`,
    );
  }

  markAttendance(recordId: number, payload: MarkAttendanceRequest): Observable<AttendanceRecord> {
    return this.http.patch<AttendanceRecord>(`${this.attendanceUrl}/${recordId}/mark`, payload);
  }

  updateAttendanceRowData(
    recordId: number,
    rowData: { [key: string]: string },
  ): Observable<AttendanceRecord> {
    return this.http.patch<AttendanceRecord>(`${this.attendanceUrl}/${recordId}/data`, rowData);
  }

  deleteAttendanceRecord(recordId: number): Observable<void> {
    return this.http.delete<void>(`${this.attendanceUrl}/${recordId}`);
  }
}
