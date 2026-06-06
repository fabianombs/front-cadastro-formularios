import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { FormSubmission, AppointmentResponse, AttendanceRecord, AttendanceCompanion } from './form-template.service';
import { DashboardSummary } from './dashboard.service';
import { RankingResponse } from './quiz.service';
import { SurveyReport } from './survey.service';

@Injectable({ providedIn: 'root' })
export class ExportService {
  // ─────────────────────────────────────────────
  // RESPOSTAS (FormSubmission)
  // ─────────────────────────────────────────────
  exportSubmissions(submissions: FormSubmission[], templateName: string, fieldOrder: string[] = []): void {
    if (!submissions.length) return;

    const cols = this.getSubmissionColumns(submissions, fieldOrder);

    const rows = submissions.map((s) => {
      const row: Record<string, string> = { ID: String(s.id) };
      cols.forEach((col) => {
        row[this.capitalize(col)] = s.values?.[col] ?? '';
      });
      row['Data'] = this.formatDateTime(s.createdAt);
      return row;
    });

    this.writeFile(rows, `respostas_${this.slug(templateName)}`);
  }

  // ─────────────────────────────────────────────
  // AGENDAMENTOS (AppointmentResponse)
  // ─────────────────────────────────────────────
  exportAppointments(appointments: AppointmentResponse[], templateName: string, fieldOrder: string[] = []): void {
    if (!appointments.length) return;

    const extraCols = this.getAppointmentExtraCols(appointments, fieldOrder);

    const rows = appointments.map((a) => {
      const row: Record<string, string> = {
        ID: String(a.id),
        Data: this.formatDate(a.slotDate),
        Hora: a.slotTime?.substring(0, 5) ?? '',
        Status: a.status === 'AGENDADO' ? 'Confirmado' : 'Cancelado',
        Nome: a.bookedByName ?? '',
        Contato: a.bookedByContact ?? '',
        'Cancelado por': a.cancelledBy ?? '',
        'Cancelado em': a.cancelledAt ? this.formatDateTime(a.cancelledAt) : '',
        'Agendado em': this.formatDateTime(a.createdAt),
      };
      extraCols.forEach((col) => {
        row[this.capitalize(col)] = a.extraValues?.[col] ?? '';
      });
      return row;
    });

    this.writeFile(rows, `agendamentos_${this.slug(templateName)}`);
  }

  // ─────────────────────────────────────────────
  // LISTA DE PRESENÇA (AttendanceRecord)
  // ─────────────────────────────────────────────
  exportAttendance(
    records: AttendanceRecord[],
    templateName: string,
    templateFieldLabels: string[] = [],
  ): void {
    if (!records.length) return;

    // Campos do template entram primeiro (garantidos mesmo se ainda vazios),
    // depois qualquer coluna extra vinda da planilha que não esteja no template.
    const fromTemplate = new Set(templateFieldLabels);
    const fromData = this.getAttendanceCols(records);
    const dataCols = [
      ...templateFieldLabels,
      ...fromData.filter((c) => !fromTemplate.has(c)),
    ];

    // Detecta qual coluna do template representa "Nome" e "Telefone"
    // para mapear os dados do acompanhante na coluna semântica correta.
    const nameCol = dataCols.find((c) => /^nome$/i.test(c.trim()))
      ?? dataCols.find((c) => /nome/i.test(c));
    const phoneCol = dataCols.find((c) => /^(telefone|tel\.?|celular|fone)$/i.test(c.trim()))
      ?? dataCols.find((c) => /tel|fone|celular/i.test(c));

    // Se não houver coluna semântica, cria colunas dedicadas para acompanhantes
    const useExtraNameCol = !nameCol;
    const useExtraPhoneCol = !phoneCol;

    // Monta linhas: cada convidado + sub-linhas para seus acompanhantes
    const dataRows: Record<string, string>[] = [];
    for (const r of records) {
      const guestRow: Record<string, string> = { Tipo: 'Convidado' };
      dataCols.forEach((col) => {
        guestRow[this.capitalize(col)] = r.rowData?.[col] ?? '';
      });
      // Colunas extras ficam vazias para convidados
      if (useExtraNameCol) guestRow['Nome (Acomp.)'] = '';
      if (useExtraPhoneCol) guestRow['Tel. (Acomp.)'] = '';
      guestRow['Presente'] = r.attended ? 'Sim' : 'Não';
      guestRow['Horário Presença'] = r.attendedAt ? this.formatDateTime(r.attendedAt) : '';
      guestRow['Observações'] = r.notes ?? '';
      dataRows.push(guestRow);

      // Sub-linha por acompanhante (prefixo "↳" para destaque visual no Excel)
      for (const c of (r.companions ?? [])) {
        const companionRow: Record<string, string> = { Tipo: '↳ Acompanhante' };
        // Todas as colunas do template ficam vazias
        dataCols.forEach((col) => { companionRow[this.capitalize(col)] = ''; });

        // Nome do acompanhante → coluna semântica "Nome" ou coluna dedicada
        if (nameCol) {
          companionRow[this.capitalize(nameCol)] = c.name;
        } else {
          companionRow['Nome (Acomp.)'] = c.name;
        }

        // Telefone do acompanhante → coluna semântica "Telefone" ou coluna dedicada
        if (phoneCol) {
          companionRow[this.capitalize(phoneCol)] = c.phone ?? '';
        } else {
          companionRow['Tel. (Acomp.)'] = c.phone ?? '';
        }

        companionRow['Presente'] = c.attended ? 'Sim' : 'Não';
        companionRow['Horário Presença'] = c.attendedAt ? this.formatDateTime(c.attendedAt) : '';
        companionRow['Observações'] = '';
        dataRows.push(companionRow);
      }
    }

    const wb = XLSX.utils.book_new();

    // Aba principal: convidados + acompanhantes como sub-linhas
    const wsData = XLSX.utils.json_to_sheet(dataRows);
    this.autoWidth(wsData, dataRows as any);
    XLSX.utils.book_append_sheet(wb, wsData, 'Lista de Presença');

    // Aba de resumo com totais
    const presentes = records.filter((r) => r.attended);
    const allCompanions = records.flatMap((r) => r.companions ?? []);
    const totalAcomp = allCompanions.length;
    // Conta acompanhantes com presença marcada individualmente
    const acompPresentes = allCompanions.filter((c) => c.attended).length;
    const resumo = [
      { Métrica: 'Total de Convidados', Valor: records.length },
      { Métrica: 'Convidados Presentes', Valor: presentes.length },
      { Métrica: 'Convidados Ausentes', Valor: records.length - presentes.length },
      { Métrica: 'Total de Acompanhantes', Valor: totalAcomp },
      { Métrica: 'Acompanhantes Presentes', Valor: acompPresentes },
      { Métrica: 'Total Geral de Pessoas', Valor: records.length + totalAcomp },
      { Métrica: 'Total Geral Presentes', Valor: presentes.length + acompPresentes },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    this.autoWidth(wsResumo, resumo as any);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    XLSX.writeFile(wb, `presenca_${this.slug(templateName)}.xlsx`);
  }

  // ─────────────────────────────────────────────
  // DASHBOARD RESUMO
  // ─────────────────────────────────────────────
  exportDashboard(summary: DashboardSummary): void {
    const wb = XLSX.utils.book_new();

    // Aba 1 — Resumo geral
    const resumo = [
      { Métrica: 'Total de Formulários', Valor: summary.totalTemplates },
      { Métrica: 'Total de Clientes', Valor: summary.totalClients },
      { Métrica: 'Total de Submissões', Valor: summary.totalSubmissions },
      { Métrica: 'Total de Agendamentos', Valor: summary.totalAppointments },
      { Métrica: 'Agend. Confirmados', Valor: summary.confirmedAppointments },
      { Métrica: 'Agend. Cancelados', Valor: summary.cancelledAppointments },
      { Métrica: 'Total Lista de Presença', Valor: summary.totalAttendanceRecords },
      { Métrica: 'Presentes', Valor: summary.presentAttendanceRecords },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    this.autoWidth(wsResumo, resumo as any);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Aba 2 — Por formulário
    if (summary.templates?.length) {
      const rows = summary.templates.map((t) => ({
        Formulário: t.name,
        Cliente: t.clientName ?? '',
        'Tem Agenda': t.hasSchedule ? 'Sim' : 'Não',
        Submissões: t.submissionCount,
        'Agend. Total': t.appointmentTotal,
        'Agend. Confirmados': t.appointmentConfirmed,
        'Agend. Cancelados': t.appointmentCancelled,
        'Lista Presença Total': t.attendanceTotal,
        Presentes: t.attendancePresent,
      }));
      const wsTemplates = XLSX.utils.json_to_sheet(rows);
      this.autoWidth(wsTemplates, rows as any);
      XLSX.utils.book_append_sheet(wb, wsTemplates, 'Por Formulário');
    }

    XLSX.writeFile(wb, `dashboard_${this.formatFileDate()}.xlsx`);
  }

  // ─────────────────────────────────────────────
  // RANKING DO QUIZ
  // ─────────────────────────────────────────────
  exportRanking(ranking: RankingResponse, quizName: string): void {
    if (!ranking.top.length) return;

    const rows = ranking.top.map((s, i) => ({
      'Posição':       s.rankPosition ?? i + 1,
      'Nome':          s.playerName,
      'Contato':       s.playerContact ?? '',
      'Acertos':       `${s.correctAnswers}/${s.totalQuestions}`,
      'Pontuação':     s.totalScore,
      'Concluído em':  s.completedAt ? this.formatDateTime(s.completedAt) : '',
    }));

    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.json_to_sheet(rows);
    this.autoWidth(ws, rows as any);
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking');

    // Aba de resumo
    const resumo = [
      { 'Quiz': quizName || ranking.templateName },
      { 'Quiz': `Total de participantes: ${ranking.totalParticipants}` },
      { 'Quiz': `Exportado em: ${new Date().toLocaleString('pt-BR')}` },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    XLSX.writeFile(wb, `ranking_${this.slug(quizName || ranking.templateName)}_${this.formatFileDate()}.xlsx`);
  }

  // ─────────────────────────────────────────────
  // PESQUISA DE SATISFAÇÃO (SurveyReport)
  // ─────────────────────────────────────────────
  exportSurvey(report: SurveyReport, surveyName: string): void {
    if (!report.responses.length && report.totalResponses === 0) return;

    const wb = XLSX.utils.book_new();

    // Aba 1 — Respostas detalhadas
    const rows = report.responses.map((r, i) => ({
      '#': i + 1,
      'Data/Hora': this.formatDateTime(r.createdAt),
      'Score': r.score,
      'Avaliação': r.scoreLabel,
      'Comentário': r.comment ?? '',
      'Referência': r.respondentRef ?? '',
      'Template Origem': r.sourceTemplateSlug ?? '',
    }));
    const wsRespostas = XLSX.utils.json_to_sheet(rows);
    this.autoWidth(wsRespostas, rows as any);
    XLSX.utils.book_append_sheet(wb, wsRespostas, 'Respostas');

    // Aba 2 — Resumo e distribuição
    const resumo = [
      { Métrica: 'Pesquisa', Valor: report.surveyName },
      { Métrica: 'Total de Respostas', Valor: report.totalResponses },
      { Métrica: 'Média Geral', Valor: report.averageScore },
      { Métrica: '', Valor: '' },
      { Métrica: '— Distribuição —', Valor: '' },
      ...Object.entries(report.scoreDistribution).map(([label, count]) => ({
        Métrica: label,
        Valor: count,
      })),
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    this.autoWidth(wsResumo, resumo as any);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    XLSX.writeFile(wb, `satisfacao_${this.slug(surveyName)}_${this.formatFileDate()}.xlsx`);
  }

  private formatFileDate(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
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
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
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
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    this.autoWidth(ws, rows);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  private autoWidth(ws: XLSX.WorkSheet, rows: Record<string, string>[]): void {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    ws['!cols'] = cols.map((col) => {
      const maxLen = Math.max(col.length, ...rows.map((r) => String(r[col] ?? '').length));
      return { wch: Math.min(maxLen + 2, 60) };
    });
  }

  private getSubmissionColumns(submissions: FormSubmission[], fieldOrder: string[] = []): string[] {
    const allKeys = new Set<string>();
    submissions.forEach((s) => Object.keys(s.values || {}).forEach((k) => allKeys.add(k)));
    return [
      ...fieldOrder.filter(k => allKeys.has(k)),
      ...Array.from(allKeys).filter(k => !fieldOrder.includes(k)),
    ];
  }

  private getAppointmentExtraCols(appointments: AppointmentResponse[], fieldOrder: string[] = []): string[] {
    const allKeys = new Set<string>();
    appointments.forEach((a) => Object.keys(a.extraValues || {}).forEach((k) => allKeys.add(k)));
    return [
      ...fieldOrder.filter(k => allKeys.has(k)),
      ...Array.from(allKeys).filter(k => !fieldOrder.includes(k)),
    ];
  }

  private getAttendanceCols(records: AttendanceRecord[]): string[] {
    const keys = new Set<string>();
    records.forEach((r) => Object.keys(r.rowData || {}).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }

  private formatDate(d: string): string {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  private formatDateTime(dt: string): string {
    if (!dt) return '';
    // Garante que o timestamp seja interpretado como UTC (backend retorna sem 'Z')
    const normalized = /[Zz]|[+\-]\d{2}:\d{2}$/.test(dt) ? dt : dt + 'Z';
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return dt;
    return date.toLocaleString('pt-BR');
  }

  private slug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  private capitalize(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
