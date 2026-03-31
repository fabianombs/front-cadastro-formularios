import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { FormSubmission, AppointmentResponse, AttendanceRecord } from './form-template.service';
import { DashboardSummary } from './dashboard.service';

@Injectable({ providedIn: 'root' })
export class ExportService {

  // ─────────────────────────────────────────────
  // RESPOSTAS (FormSubmission)
  // ─────────────────────────────────────────────
  exportSubmissions(submissions: FormSubmission[], templateName: string): void {
    if (!submissions.length) return;

    const cols = this.getSubmissionColumns(submissions);

    const rows = submissions.map(s => {
      const row: Record<string, string> = {
        'ID': String(s.id),
        'Data': this.formatDateTime(s.createdAt),
      };
      cols.forEach(col => { row[this.capitalize(col)] = s.values?.[col] ?? ''; });
      return row;
    });

    this.writeFile(rows, `respostas_${this.slug(templateName)}`);
  }

  // ─────────────────────────────────────────────
  // AGENDAMENTOS (AppointmentResponse)
  // ─────────────────────────────────────────────
  exportAppointments(appointments: AppointmentResponse[], templateName: string): void {
    if (!appointments.length) return;

    const extraCols = this.getAppointmentExtraCols(appointments);

    const rows = appointments.map(a => {
      const row: Record<string, string> = {
        'ID':             String(a.id),
        'Data':           this.formatDate(a.slotDate),
        'Hora':           a.slotTime?.substring(0, 5) ?? '',
        'Status':         a.status === 'AGENDADO' ? 'Confirmado' : 'Cancelado',
        'Nome':           a.bookedByName ?? '',
        'Contato':        a.bookedByContact ?? '',
        'Cancelado por':  a.cancelledBy ?? '',
        'Cancelado em':   a.cancelledAt ? this.formatDateTime(a.cancelledAt) : '',
        'Agendado em':    this.formatDateTime(a.createdAt),
      };
      extraCols.forEach(col => { row[this.capitalize(col)] = a.extraValues?.[col] ?? ''; });
      return row;
    });

    this.writeFile(rows, `agendamentos_${this.slug(templateName)}`);
  }

  // ─────────────────────────────────────────────
  // LISTA DE PRESENÇA (AttendanceRecord)
  // ─────────────────────────────────────────────
  exportAttendance(records: AttendanceRecord[], templateName: string): void {
    if (!records.length) return;

    const dataCols = this.getAttendanceCols(records);

    const rows = records.map(r => {
      const row: Record<string, string> = {};
      dataCols.forEach(col => { row[this.capitalize(col)] = r.rowData?.[col] ?? ''; });
      row['Presente']       = r.attended ? 'Sim' : 'Não';
      row['Horário Presença'] = r.attendedAt ? this.formatDateTime(r.attendedAt) : '';
      row['Observações']    = r.notes ?? '';
      return row;
    });

    this.writeFile(rows, `presenca_${this.slug(templateName)}`);
  }

  // ─────────────────────────────────────────────
  // DASHBOARD RESUMO
  // ─────────────────────────────────────────────
  exportDashboard(summary: DashboardSummary): void {
    const wb = XLSX.utils.book_new();

    // Aba 1 — Resumo geral
    const resumo = [
      { 'Métrica': 'Total de Formulários',     'Valor': summary.totalTemplates },
      { 'Métrica': 'Total de Clientes',         'Valor': summary.totalClients },
      { 'Métrica': 'Total de Submissões',       'Valor': summary.totalSubmissions },
      { 'Métrica': 'Total de Agendamentos',     'Valor': summary.totalAppointments },
      { 'Métrica': 'Agend. Confirmados',        'Valor': summary.confirmedAppointments },
      { 'Métrica': 'Agend. Cancelados',         'Valor': summary.cancelledAppointments },
      { 'Métrica': 'Total Lista de Presença',   'Valor': summary.totalAttendanceRecords },
      { 'Métrica': 'Presentes',                 'Valor': summary.presentAttendanceRecords },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    this.autoWidth(wsResumo, resumo as any);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Aba 2 — Por formulário
    if (summary.templates?.length) {
      const rows = summary.templates.map(t => ({
        'Formulário':           t.name,
        'Cliente':              t.clientName ?? '',
        'Tem Agenda':           t.hasSchedule ? 'Sim' : 'Não',
        'Submissões':           t.submissionCount,
        'Agend. Total':         t.appointmentTotal,
        'Agend. Confirmados':   t.appointmentConfirmed,
        'Agend. Cancelados':    t.appointmentCancelled,
        'Lista Presença Total': t.attendanceTotal,
        'Presentes':            t.attendancePresent,
      }));
      const wsTemplates = XLSX.utils.json_to_sheet(rows);
      this.autoWidth(wsTemplates, rows as any);
      XLSX.utils.book_append_sheet(wb, wsTemplates, 'Por Formulário');
    }

    XLSX.writeFile(wb, `dashboard_${this.formatFileDate()}.xlsx`);
  }

  private formatFileDate(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  }

  // ─────────────────────────────────────────────
  // LER planilha Excel → array de objetos
  // ─────────────────────────────────────────────
  readExcelFile(file: File): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const wb   = XLSX.read(data, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
            defval: '',
            raw: false,
          });
          resolve(json);
        } catch {
          reject(new Error('Arquivo inválido ou corrompido'));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  // ─────────────────────────────────────────────
  // PRIVADOS
  // ─────────────────────────────────────────────
  private writeFile(rows: Record<string, string>[], filename: string): void {
    const ws  = XLSX.utils.json_to_sheet(rows);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    this.autoWidth(ws, rows);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  private autoWidth(ws: XLSX.WorkSheet, rows: Record<string, string>[]): void {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    ws['!cols'] = cols.map(col => {
      const maxLen = Math.max(
        col.length,
        ...rows.map(r => String(r[col] ?? '').length)
      );
      return { wch: Math.min(maxLen + 2, 60) };
    });
  }

  private getSubmissionColumns(submissions: FormSubmission[]): string[] {
    const keys = new Set<string>();
    submissions.forEach(s => Object.keys(s.values || {}).forEach(k => keys.add(k)));
    return Array.from(keys).sort();
  }

  private getAppointmentExtraCols(appointments: AppointmentResponse[]): string[] {
    const keys = new Set<string>();
    appointments.forEach(a => Object.keys(a.extraValues || {}).forEach(k => keys.add(k)));
    return Array.from(keys);
  }

  private getAttendanceCols(records: AttendanceRecord[]): string[] {
    const keys = new Set<string>();
    records.forEach(r => Object.keys(r.rowData || {}).forEach(k => keys.add(k)));
    return Array.from(keys);
  }

  private formatDate(d: string): string {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  private formatDateTime(dt: string): string {
    if (!dt) return '';
    const date = new Date(dt);
    if (isNaN(date.getTime())) return dt;
    return date.toLocaleString('pt-BR');
  }

  private slug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  private capitalize(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
