import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormTemplateService,
  FormTemplate,
  FormSubmission,
  AppointmentResponse,
  AttendanceRecord,
} from '../../core/services/form-template.service';
import { AuthService } from '../../core/services/auth.service';
import { ExportService } from '../../core/services/export.service';
import { MessageService } from '../../core/services/message.service';
import { FormsModule } from '@angular/forms';
import {
  PaginationComponent,
  SpringPage,
} from '../../shared/components/pagination/pagination.component';
import {
  DataTableComponent,
  DataTableColumn,
} from '../../shared/components/data-table/data-table.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';

interface FilterableField {
  col: string;
  label: string;
  filterType: 'text' | 'select' | 'daterange' | 'number';
  uniqueVals: string[];
}

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLink, PaginationComponent, DataTableComponent, FooterComponent, PageShellComponent, PageHeaderComponent],
  templateUrl: './template-list.component.html',
  styleUrl: './template-list.component.scss',
})
export class TemplateListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(FormTemplateService);
  private exporter = inject(ExportService);
  private messages = inject(MessageService);
  public auth = inject(AuthService);

  readonly pageSizeOptions = [2, 5, 10, 50];
  pageSize = signal(50);

  // ── Estado base ─────────────────────────────────────────────
  template = signal<FormTemplate | null>(null);
  submissions = signal<FormSubmission[]>([]);
  columns = signal<string[]>([]);
  appointments = signal<AppointmentResponse[]>([]);
  loading = signal(true);

  // ── Paginação por aba ────────────────────────────────────────
  apptPage = signal(0);
  apptTotalPages = signal(0);
  apptTotalElements = signal(0);

  subPage = signal(0);
  subTotalPages = signal(0);
  subTotalElements = signal(0);

  attPage = signal(0);
  attTotalPages = signal(0);
  attTotalElements = signal(0);

  apptPagination = computed<SpringPage>(() => ({
    page: this.apptPage(),
    size: this.pageSize(),
    totalElements: this.apptTotalElements(),
    totalPages: this.apptTotalPages(),
  }));

  subPagination = computed<SpringPage>(() => ({
    page: this.subPage(),
    size: this.pageSize(),
    totalElements: this.subTotalElements(),
    totalPages: this.subTotalPages(),
  }));

  attPagination = computed<SpringPage>(() => ({
    page: this.attPage(),
    size: this.pageSize(),
    totalElements: this.attTotalElements(),
    totalPages: this.attTotalPages(),
  }));

  // ── Aba ativa ────────────────────────────────────────────────
  activeTab = signal<'appointments' | 'submissions' | 'attendance'>('submissions');

  // ── Filtros globais ─────────────────────────────────────────
  globalSearch = signal('');
  fieldFilters = signal<Record<string, string>>({});
  filtersOpen = signal(true);

  // ── Ordenação ────────────────────────────────────────────────
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');

  // ── Cancelamento / deleção ───────────────────────────────────
  cancellingId = signal<number | null>(null);
  deletingId = signal<number | null>(null);

  // ── Presença ─────────────────────────────────────────────────
  attendance = signal<AttendanceRecord[]>([]);
  attendanceCols = computed<string[]>(() => {
    const keys = new Set<string>();
    this.attendance().forEach((r) => Object.keys(r.rowData || {}).forEach((k) => keys.add(k)));
    return Array.from(keys);
  });
  attendanceStats = computed(() => ({
    total: this.attTotalElements(),
    presente: this.attendance().filter((r) => r.attended).length,
    ausente: this.attendance().filter((r) => !r.attended).length,
  }));
  markingId = signal<number | null>(null);
  attendanceSearch = signal('');

  // ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return;

    this.service.getTemplateBySlug(slug).subscribe({
      next: (t) => {
        this.template.set(t);

        if (t.hasSchedule) this.activeTab.set('appointments');
        else if (t.hasAttendance) this.activeTab.set('attendance');
        else this.activeTab.set('submissions');

        this.loadAppointments();
        this.loadAttendance();
        this.loadSubmissions();
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Loaders por aba ──────────────────────────────────────────

  private loadAppointments(): void {
    const t = this.template();
    if (!t) return;
    this.service.getAppointmentsByTemplate(t.id, this.apptPage(), this.pageSize()).subscribe({
      next: (page) => {
        this.appointments.set(page.content);
        this.apptTotalPages.set(page.totalPages);
        this.apptTotalElements.set(page.totalElements);
      },
      error: () => this.appointments.set([]),
    });
  }

  private loadSubmissions(): void {
    const t = this.template();
    if (!t) return;
    this.service.getSubmissionsByTemplate(t.id, this.subPage(), this.pageSize()).subscribe({
      next: (page) => {
        this.submissions.set(page.content);
        this.buildColumns(page.content);
        this.subTotalPages.set(page.totalPages);
        this.subTotalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadAttendance(): void {
    const t = this.template();
    if (!t) return;
    this.service.getAttendance(t.id, this.attPage(), this.pageSize()).subscribe({
      next: (page) => {
        this.attendance.set(page.content);
        this.attTotalPages.set(page.totalPages);
        this.attTotalElements.set(page.totalElements);
        // fallback: se hasAttendance não foi marcado mas há registros, muda aba
        if (
          !this.template()?.hasSchedule &&
          !this.template()?.hasAttendance &&
          page.totalElements > 0
        ) {
          this.activeTab.set('attendance');
        }
      },
      error: () => this.attendance.set([]),
    });
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.apptPage.set(0);
    this.subPage.set(0);
    this.attPage.set(0);
    this.loadAppointments();
    this.loadSubmissions();
    this.loadAttendance();
  }

  goToApptPage(n: number): void {
    this.apptPage.set(n);
    this.loadAppointments();
  }

  goToSubPage(n: number): void {
    this.subPage.set(n);
    this.loadSubmissions();
  }

  goToAttPage(n: number): void {
    this.attPage.set(n);
    this.loadAttendance();
  }

  // ── Build colunas dinâmicas (submissions) ───────────────────
  private buildColumns(subs: FormSubmission[]) {
    const keys = new Set<string>();
    subs.forEach((s) => Object.keys(s.values || {}).forEach((k) => keys.add(k)));
    this.columns.set(Array.from(keys).sort());
  }

  // ── Colunas extras dos agendamentos ─────────────────────────
  appointmentExtraCols = computed<string[]>(() => {
    const keys = new Set<string>();
    this.appointments().forEach((a) =>
      Object.keys(a.extraValues || {}).forEach((k) => keys.add(k)),
    );
    return Array.from(keys);
  });

  apptColumns = computed<DataTableColumn[]>(() => [
    { key: 'slotDate', label: 'Data', sortable: true, width: '130px' },
    { key: 'slotTime', label: 'Hora', sortable: true, width: '90px' },
    { key: 'status', label: 'Status', sortable: true, width: '120px' },
    { key: 'bookedByName', label: 'Nome', sortable: true },
    { key: 'bookedByContact', label: 'Contato' },
    ...this.appointmentExtraCols().map((col) => ({
      key: col,
      label: this.formatLabel(col),
      sortable: true,
    })),
    { key: 'createdAt', label: 'Agendado em' },
    { key: 'action', label: 'Ação', width: '90px' },
  ]);

  subColumns = computed<DataTableColumn[]>(() => [
    { key: 'id', label: 'ID', sortable: true, width: '60px' },
    { key: 'createdAt', label: 'Data', sortable: true, width: '140px' },
    ...this.columns().map((col) => ({
      key: col,
      label: this.formatLabel(col),
      sortable: true,
    })),
    { key: 'action', label: 'Ação', width: '90px' },
  ]);

  attendanceColumnsMeta = computed<DataTableColumn[]>(() => [
    { key: 'attendance', label: 'Presença', width: '110px', align: 'center' },
    ...this.attendanceCols().map((col) => ({ key: col, label: this.formatLabel(col) })),
    { key: 'notes', label: 'Obs.' },
    { key: 'attendedAt', label: 'Marcado em', width: '120px' },
  ]);

  attendanceRowClass = (row: AttendanceRecord) => ({ 'row--present': row.attended });

  // ── Stats agendamentos ───────────────────────────────────────
  appointmentStats = computed(() => ({
    total: this.apptTotalElements(),
    agendado: this.appointments().filter((a) => a.status === 'AGENDADO').length,
    cancelado: this.appointments().filter((a) => a.status === 'CANCELADO').length,
  }));

  // ── Agendamentos filtrados + ordenados ───────────────────────
  filteredAppointments = computed<AppointmentResponse[]>(() => {
    let data = [...this.appointments()];
    const search = this.globalSearch().toLowerCase().trim();
    const filters = this.fieldFilters();

    if (search) {
      data = data.filter(
        (a) =>
          (a.bookedByName ?? '').toLowerCase().includes(search) ||
          (a.bookedByContact ?? '').toLowerCase().includes(search) ||
          a.slotDate.includes(search) ||
          Object.values(a.extraValues || {}).some((v) => v.toLowerCase().includes(search)),
      );
    }

    const statusFilter = filters['appt_status'];
    if (statusFilter) data = data.filter((a) => a.status === statusFilter);

    const dateStart = filters['appt_date__start'];
    const dateEnd = filters['appt_date__end'];
    if (dateStart) data = data.filter((a) => a.slotDate >= dateStart);
    if (dateEnd) data = data.filter((a) => a.slotDate <= dateEnd);

    const col = this.sortColumn();
    if (col) {
      const dir = this.sortDirection();
      data.sort((a, b) => {
        const av = this.getApptSortValue(a, col);
        const bv = this.getApptSortValue(b, col);
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    return data;
  });

  private getApptSortValue(a: AppointmentResponse, col: string): string {
    const map: Record<string, string> = {
      slotDate: a.slotDate ?? '',
      slotTime: a.slotTime ?? '',
      bookedByName: a.bookedByName ?? '',
      bookedByContact: a.bookedByContact ?? '',
      status: a.status ?? '',
    };
    return map[col] ?? a.extraValues?.[col] ?? '';
  }

  // ── Submissions filtradas + ordenadas ────────────────────────
  filterableFields = computed<FilterableField[]>(() => {
    const cols = this.columns();
    const subs = this.submissions();
    const tFields = this.template()?.fields ?? [];

    const fields: FilterableField[] = [
      { col: 'createdAt', label: 'Data', filterType: 'daterange', uniqueVals: [] },
    ];

    for (const col of cols) {
      const tf = tFields.find((f) => f.label.toLowerCase() === col.replace(/_/g, ' '));
      const uniqueVals = [
        ...new Set(subs.map((s) => s.values?.[col]).filter((v): v is string => !!v)),
      ].sort();

      let filterType: FilterableField['filterType'] = 'text';
      if (tf?.type === 'date') filterType = 'daterange';
      else if (tf?.type === 'number') filterType = 'number';
      else if (tf?.type === 'select' || tf?.type === 'radio') filterType = 'select';
      else if (uniqueVals.length > 0 && uniqueVals.length <= 10) filterType = 'select';

      fields.push({ col, label: this.formatLabel(col), filterType, uniqueVals });
    }

    return fields;
  });

  filteredSubmissions = computed<FormSubmission[]>(() => {
    let data = [...this.submissions()];
    const search = this.globalSearch().toLowerCase().trim();
    const filters = this.fieldFilters();

    if (search) {
      data = data.filter(
        (s) =>
          Object.values(s.values || {}).some((v) => String(v).toLowerCase().includes(search)) ||
          s.id.toString().includes(search),
      );
    }

    for (const key of Object.keys(filters)) {
      const val = filters[key];
      if (!val) continue;

      if (key === 'createdAt__start') {
        data = data.filter((s) => s.createdAt.substring(0, 10) >= val);
      } else if (key === 'createdAt__end') {
        data = data.filter((s) => s.createdAt.substring(0, 10) <= val);
      } else {
        const colKey = key.replace('__start', '').replace('__end', '');
        if (key.endsWith('__start')) {
          data = data.filter((s) => (s.values?.[colKey] ?? '') >= val);
        } else if (key.endsWith('__end')) {
          data = data.filter((s) => (s.values?.[colKey] ?? '') <= val);
        } else {
          data = data.filter((s) =>
            String(s.values?.[key] ?? '')
              .toLowerCase()
              .includes(val.toLowerCase()),
          );
        }
      }
    }

    const col = this.sortColumn();
    if (col) {
      const dir = this.sortDirection();
      data.sort((a, b) => {
        const av = col === 'createdAt' ? a.createdAt : (a.values?.[col] ?? '');
        const bv = col === 'createdAt' ? b.createdAt : (b.values?.[col] ?? '');
        return dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }

    return data;
  });

  // ── Active filter chips ──────────────────────────────────────
  activeFiltersList = computed(() => {
    const filters = this.fieldFilters();
    const result: { col: string; label: string; value: string; key: string }[] = [];

    for (const key of Object.keys(filters)) {
      if (!filters[key]) continue;
      const isStart = key.endsWith('__start');
      const isEnd = key.endsWith('__end');
      const col = isStart ? key.replace('__start', '') : isEnd ? key.replace('__end', '') : key;

      const labelMap: Record<string, string> = {
        createdAt: 'Data',
        appt_date: 'Data Agend.',
        appt_status: 'Status',
      };
      const label = labelMap[col] ?? this.formatLabel(col);
      const value = isStart ? `≥ ${filters[key]}` : isEnd ? `≤ ${filters[key]}` : filters[key];

      result.push({ col, label, value, key });
    }

    return result;
  });

  activeFiltersCount = computed(
    () =>
      Object.values(this.fieldFilters()).filter((v) => !!v).length + (this.globalSearch() ? 1 : 0),
  );

  // ── Actions ──────────────────────────────────────────────────
  sort(col: string) {
    if (this.sortColumn() === col) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(col: string): string {
    if (this.sortColumn() !== col) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  isSorted(col: string): boolean {
    return this.sortColumn() === col;
  }

  getFieldFilter(key: string): string {
    return this.fieldFilters()[key] ?? '';
  }

  setFieldFilter(key: string, value: string) {
    this.fieldFilters.update((f) => ({ ...f, [key]: value }));
  }

  clearFilter(key: string) {
    this.fieldFilters.update((f) => {
      const u = { ...f };
      delete u[key];
      return u;
    });
  }

  clearAllFilters() {
    this.globalSearch.set('');
    this.fieldFilters.set({});
  }

  // ── Presença filtrada ────────────────────────────────────────
  filteredAttendance = computed<AttendanceRecord[]>(() => {
    const search = this.attendanceSearch().toLowerCase().trim();
    if (!search) return this.attendance();
    return this.attendance().filter(
      (r) =>
        Object.values(r.rowData || {}).some((v) => v.toLowerCase().includes(search)) ||
        (r.notes ?? '').toLowerCase().includes(search),
    );
  });

  toggleAttendance(record: AttendanceRecord) {
    this.markingId.set(record.id);
    this.service
      .markAttendance(record.id, {
        attended: !record.attended,
        notes: record.notes ?? null,
      })
      .subscribe({
        next: (updated) => {
          this.attendance.update((list) => list.map((r) => (r.id === record.id ? updated : r)));
          this.markingId.set(null);
        },
        error: () => {
          this.messages.error('Erro ao atualizar presença.');
          this.markingId.set(null);
        },
      });
  }

  saveNote(record: AttendanceRecord, note: string) {
    this.service
      .markAttendance(record.id, {
        attended: record.attended,
        notes: note || null,
      })
      .subscribe({
        next: (updated) => {
          this.attendance.update((list) => list.map((r) => (r.id === record.id ? updated : r)));
        },
        error: () => this.messages.error('Erro ao salvar observação.'),
      });
  }

  // ── Exports ──────────────────────────────────────────────────
  exportSubmissionsXlsx() {
    const t = this.template();
    if (!t) return;
    this.exporter.exportSubmissions(this.filteredSubmissions(), t.name);
  }

  exportAppointmentsXlsx() {
    const t = this.template();
    if (!t) return;
    this.exporter.exportAppointments(this.filteredAppointments(), t.name);
  }

  exportAttendanceXlsx() {
    const t = this.template();
    if (!t) return;
    this.exporter.exportAttendance(this.filteredAttendance(), t.name);
  }

  doDelete(id: number) {
    if (!confirm('Deseja excluir esta resposta? Esta ação não pode ser desfeita.')) return;
    this.deletingId.set(id);
    this.service.deleteSubmission(id).subscribe({
      next: () => {
        this.submissions.update((list) => list.filter((s) => s.id !== id));
        this.buildColumns(this.submissions());
        this.deletingId.set(null);
      },
      error: () => {
        this.messages.error('Erro ao excluir resposta.');
        this.deletingId.set(null);
      },
    });
  }

  doCancel(id: number) {
    if (!confirm('Deseja cancelar este agendamento?')) return;
    this.cancellingId.set(id);
    this.service.cancelAppointment(id).subscribe({
      next: (updated) => {
        this.appointments.update((list) => list.map((a) => (a.id === id ? updated : a)));
        this.cancellingId.set(null);
      },
      error: () => {
        this.messages.error('Erro ao cancelar agendamento.');
        this.cancellingId.set(null);
      },
    });
  }

  // ── Appearance ───────────────────────────────────────────────

  /** Apenas o background — usado no overlay fixo que cobre o viewport inteiro */
  bgOnlyStyle = computed(() => {
    const a = this.template()?.appearance;
    if (!a) return {};
    const style: Record<string, string> = {};
    if (a.backgroundGradient) {
      style['background'] = a.backgroundGradient;
    } else if (a.backgroundImageUrl) {
      style['backgroundImage'] = `url(${a.backgroundImageUrl})`;
      style['backgroundSize'] = 'cover';
      style['backgroundPosition'] = 'center';
    } else if (a.backgroundColor) {
      style['background'] = a.backgroundColor;
    }
    return style;
  });

  /** Estilos para o .page — variáveis CSS + cor de texto */
  pageStyle = computed(() => {
    const a = this.template()?.appearance;
    const style: Record<string, string> = {};
    if (a?.formTextColor) style['color'] = a.formTextColor;
    const accent = this.accentColor();
    style['--accent'] = accent;
    // Sobrescreve CSS vars globais da tabela para seguir o tema do template
    if (this.hasAppearanceBg()) {
      // Fundo dos cards: usa cardBackgroundColor se definido, senão glass rgba
      const cardBg = a?.cardBackgroundColor || 'rgba(10, 16, 32, 0.68)';
      const cardBorder = a?.cardBorderColor || 'rgba(255, 255, 255, 0.1)';

      style['--surface']      = cardBg;
      style['--surface-high'] = a?.cardBackgroundColor
        ? cardBg                        // usa a mesma cor sólida
        : 'rgba(15, 25, 50, 0.8)';
      style['--bg-subtle']    = a?.cardBackgroundColor
        ? cardBg
        : 'rgba(5, 10, 20, 0.72)';
      style['--border']       = cardBorder;
      style['--border-hover'] = a?.cardBorderColor
        ? cardBorder
        : 'rgba(255, 255, 255, 0.18)';
      style['--text']         = a?.formTextColor || '#d8e4f8';
      style['--text-muted']   = a?.formTextColor
        ? this.hexToRgba(a.formTextColor, 0.65)
        : 'rgba(216, 228, 248, 0.65)';
      style['--primary']      = accent;
      style['--primary-muted']= this.hexToRgba(accent, 0.12);
      style['--primary-glow'] = this.hexToRgba(accent, 0.22);
      style['--surface-hover']= this.hexToRgba(accent, 0.08);
    }
    return style;
  });

  hasAppearanceBg = computed(() => {
    const a = this.template()?.appearance;
    return !!(a?.backgroundGradient || a?.backgroundImageUrl || a?.backgroundColor);
  });

  hasSolidCard = computed(() => !!this.template()?.appearance?.cardBackgroundColor);

  /** Cor de destaque: usa primaryColor ou deriva do gradiente automaticamente */
  accentColor = computed(() => {
    const a = this.template()?.appearance;
    if (!a) return '#4d8fff';
    if (a.primaryColor) return a.primaryColor;
    // Auto-deriva do gradiente: pega o primeiro hex encontrado
    if (a.backgroundGradient) {
      const hex = a.backgroundGradient.match(/#[0-9a-fA-F]{6}/);
      if (hex) return hex[0];
      // Tenta rgb()
      const rgb = a.backgroundGradient.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgb) {
        const [, r, g, b] = rgb;
        return '#' + [r, g, b].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
      }
    }
    if (a.backgroundColor) return a.backgroundColor;
    return '#4d8fff';
  });

  /** Badge de contagem das tabs */
  tabBadgeStyle(tab: 'appointments' | 'submissions' | 'attendance'): string {
    const active = this.activeTab() === tab;
    const color = this.accentColor();
    return active
      ? `background:${color};color:#fff;border-radius:99px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:6px;`
      : `background:rgba(0,0,0,0.25);color:#94a3b8;border-radius:99px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:6px;`;
  }

  /** Estilo completo do botão da tab ativa (background + borda no accentColor) */
  tabActiveStyle(tab: 'appointments' | 'submissions' | 'attendance'): Record<string, string> {
    if (this.activeTab() !== tab) return {};
    const color = this.accentColor();
    return {
      color: color,
      background: this.hexToRgba(color, 0.12),
      border: `1px solid ${this.hexToRgba(color, 0.28)}`,
    };
  }

  /** Cor do ícone de sort */
  sortColor(col: string): string {
    return this.isSorted(col) ? this.accentColor() : '';
  }

  /** Converte hex para rgba — suporta #rrggbb e #rgb */
  private hexToRgba(hex: string, alpha: number): string {
    if (!hex || !hex.startsWith('#')) return `rgba(77,143,255,${alpha})`;
    let h = hex.slice(1);
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r + g + b)) return `rgba(77,143,255,${alpha})`;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── Helpers ──────────────────────────────────────────────────
  getValue(sub: FormSubmission, col: string): string {
    return sub.values?.[col] ?? '-';
  }

  formatLabel(label: string): string {
    return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatTime(t: string): string {
    return t?.substring(0, 5) ?? '';
  }
}
