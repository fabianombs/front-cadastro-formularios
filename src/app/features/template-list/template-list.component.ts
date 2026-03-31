import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormTemplateService,
  FormTemplate,
  FormSubmission,
  AppointmentResponse,
  AttendanceRecord
} from '../../core/services/form-template.service';
import { AuthService } from '../../core/services/auth.service';
import { ExportService } from '../../core/services/export.service';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';

interface FilterableField {
  col: string;
  label: string;
  filterType: 'text' | 'select' | 'daterange' | 'number';
  uniqueVals: string[];
}

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLink],
  templateUrl: './template-list.component.html',
  styleUrl: './template-list.component.scss'
})
export class TemplateListComponent implements OnInit {

  private route    = inject(ActivatedRoute);
  private service  = inject(FormTemplateService);
  private exporter = inject(ExportService);
  public  auth     = inject(AuthService);

  // ── Estado base ─────────────────────────────────────────────
  template    = signal<FormTemplate | null>(null);
  submissions = signal<FormSubmission[]>([]);
  columns     = signal<string[]>([]);
  appointments= signal<AppointmentResponse[]>([]);
  loading     = signal(true);

  // ── Aba ativa ────────────────────────────────────────────────
  activeTab   = signal<'appointments' | 'submissions' | 'attendance'>('appointments');

  // ── Filtros globais ─────────────────────────────────────────
  globalSearch    = signal('');
  fieldFilters    = signal<Record<string, string>>({});
  filtersOpen     = signal(true);

  // ── Ordenação ────────────────────────────────────────────────
  sortColumn      = signal<string | null>(null);
  sortDirection   = signal<'asc' | 'desc'>('asc');

  // ── Cancelamento / deleção ───────────────────────────────────
  cancellingId    = signal<number | null>(null);
  deletingId      = signal<number | null>(null);

  // ── Presença ─────────────────────────────────────────────────
  attendance      = signal<AttendanceRecord[]>([]);
  attendanceCols  = computed<string[]>(() => {
    const keys = new Set<string>();
    this.attendance().forEach(r => Object.keys(r.rowData || {}).forEach(k => keys.add(k)));
    return Array.from(keys);
  });
  attendanceStats = computed(() => ({
    total    : this.attendance().length,
    presente : this.attendance().filter(r => r.attended).length,
    ausente  : this.attendance().filter(r => !r.attended).length,
  }));
  markingId       = signal<number | null>(null);

  // Busca local dentro da aba presença
  attendanceSearch = signal('');

  // ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return;

    this.service.getTemplateBySlug(slug).subscribe({
      next: (t) => {
        this.template.set(t);

        this.service.getAppointmentsByTemplate(t.id, 0, 500).pipe(map(p => p.content)).subscribe({
          next: (apps) => this.appointments.set(apps),
          error: ()   => this.appointments.set([])
        });

        this.service.getAttendance(t.id).subscribe({
          next: (recs) => {
            this.attendance.set(recs);
            // Define aba padrão após carregar tudo
            if (t.hasSchedule) this.activeTab.set('appointments');
            else if (recs.length > 0) this.activeTab.set('attendance');
            else this.activeTab.set('submissions');
          },
          error: () => this.attendance.set([])
        });

        this.service.getSubmissionsByTemplate(t.id, 0, 500).pipe(map(p => p.content)).subscribe({
          next: (subs) => {
            this.submissions.set(subs);
            this.buildColumns(subs);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  // ── Build colunas dinâmicas (submissions) ───────────────────
  private buildColumns(subs: FormSubmission[]) {
    const keys = new Set<string>();
    subs.forEach(s => Object.keys(s.values || {}).forEach(k => keys.add(k)));
    this.columns.set(Array.from(keys).sort());
  }

  // ── Colunas extras dos agendamentos ─────────────────────────
  appointmentExtraCols = computed<string[]>(() => {
    const keys = new Set<string>();
    this.appointments().forEach(a =>
      Object.keys(a.extraValues || {}).forEach(k => keys.add(k))
    );
    return Array.from(keys);
  });

  // ── Stats agendamentos ───────────────────────────────────────
  appointmentStats = computed(() => ({
    total    : this.appointments().length,
    agendado : this.appointments().filter(a => a.status === 'AGENDADO').length,
    cancelado: this.appointments().filter(a => a.status === 'CANCELADO').length,
  }));

  // ── Agendamentos filtrados + ordenados ───────────────────────
  filteredAppointments = computed<AppointmentResponse[]>(() => {
    let data = [...this.appointments()];
    const search  = this.globalSearch().toLowerCase().trim();
    const filters = this.fieldFilters();

    if (search) {
      data = data.filter(a =>
        (a.bookedByName    ?? '').toLowerCase().includes(search) ||
        (a.bookedByContact ?? '').toLowerCase().includes(search) ||
        a.slotDate.includes(search) ||
        Object.values(a.extraValues || {}).some(v => v.toLowerCase().includes(search))
      );
    }

    const statusFilter = filters['appt_status'];
    if (statusFilter) data = data.filter(a => a.status === statusFilter);

    const dateStart = filters['appt_date__start'];
    const dateEnd   = filters['appt_date__end'];
    if (dateStart) data = data.filter(a => a.slotDate >= dateStart);
    if (dateEnd)   data = data.filter(a => a.slotDate <= dateEnd);

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
      slotDate       : a.slotDate ?? '',
      slotTime       : a.slotTime ?? '',
      bookedByName   : a.bookedByName ?? '',
      bookedByContact: a.bookedByContact ?? '',
      status         : a.status ?? '',
    };
    return map[col] ?? a.extraValues?.[col] ?? '';
  }

  // ── Submissions filtradas + ordenadas ────────────────────────
  filterableFields = computed<FilterableField[]>(() => {
    const cols   = this.columns();
    const subs   = this.submissions();
    const tFields = this.template()?.fields ?? [];

    const fields: FilterableField[] = [
      { col: 'createdAt', label: 'Data', filterType: 'daterange', uniqueVals: [] }
    ];

    for (const col of cols) {
      const tf = tFields.find(f =>
        f.label.toLowerCase() === col.replace(/_/g, ' ')
      );
      const uniqueVals = [...new Set(
        subs.map(s => s.values?.[col]).filter((v): v is string => !!v)
      )].sort();

      let filterType: FilterableField['filterType'] = 'text';
      if (tf?.type === 'date')   filterType = 'daterange';
      else if (tf?.type === 'number') filterType = 'number';
      else if (tf?.type === 'select' || tf?.type === 'radio') filterType = 'select';
      else if (uniqueVals.length > 0 && uniqueVals.length <= 10) filterType = 'select';

      fields.push({ col, label: this.formatLabel(col), filterType, uniqueVals });
    }

    return fields;
  });

  filteredSubmissions = computed<FormSubmission[]>(() => {
    let data    = [...this.submissions()];
    const search  = this.globalSearch().toLowerCase().trim();
    const filters = this.fieldFilters();

    if (search) {
      data = data.filter(s =>
        Object.values(s.values || {}).some(v => String(v).toLowerCase().includes(search)) ||
        s.id.toString().includes(search)
      );
    }

    for (const key of Object.keys(filters)) {
      const val = filters[key];
      if (!val) continue;

      if (key === 'createdAt__start') {
        data = data.filter(s => s.createdAt.substring(0, 10) >= val);
      } else if (key === 'createdAt__end') {
        data = data.filter(s => s.createdAt.substring(0, 10) <= val);
      } else {
        const colKey = key.replace('__start', '').replace('__end', '');
        if (key.endsWith('__start')) {
          data = data.filter(s => (s.values?.[colKey] ?? '') >= val);
        } else if (key.endsWith('__end')) {
          data = data.filter(s => (s.values?.[colKey] ?? '') <= val);
        } else {
          data = data.filter(s =>
            String(s.values?.[key] ?? '').toLowerCase().includes(val.toLowerCase())
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
      const isEnd   = key.endsWith('__end');
      const col     = isStart ? key.replace('__start', '') : isEnd ? key.replace('__end', '') : key;

      const labelMap: Record<string, string> = {
        createdAt : 'Data',
        appt_date : 'Data Agend.',
        appt_status: 'Status',
      };
      const label = labelMap[col] ?? this.formatLabel(col);
      const value = isStart ? `≥ ${filters[key]}` : isEnd ? `≤ ${filters[key]}` : filters[key];

      result.push({ col, label, value, key });
    }

    return result;
  });

  activeFiltersCount = computed(() =>
    Object.values(this.fieldFilters()).filter(v => !!v).length +
    (this.globalSearch() ? 1 : 0)
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
    this.fieldFilters.update(f => ({ ...f, [key]: value }));
  }

  clearFilter(key: string) {
    this.fieldFilters.update(f => {
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
    return this.attendance().filter(r =>
      Object.values(r.rowData || {}).some(v => v.toLowerCase().includes(search)) ||
      (r.notes ?? '').toLowerCase().includes(search)
    );
  });

  toggleAttendance(record: AttendanceRecord) {
    this.markingId.set(record.id);
    this.service.markAttendance(record.id, {
      attended: !record.attended,
      notes: record.notes ?? null
    }).subscribe({
      next: (updated) => {
        this.attendance.update(list => list.map(r => r.id === record.id ? updated : r));
        this.markingId.set(null);
      },
      error: () => {
        alert('Erro ao atualizar presença.');
        this.markingId.set(null);
      }
    });
  }

  saveNote(record: AttendanceRecord, note: string) {
    this.service.markAttendance(record.id, {
      attended: record.attended,
      notes: note || null
    }).subscribe({
      next: (updated) => {
        this.attendance.update(list => list.map(r => r.id === record.id ? updated : r));
      },
      error: () => alert('Erro ao salvar observação.')
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
        this.submissions.update(list => list.filter(s => s.id !== id));
        this.buildColumns(this.submissions());
        this.deletingId.set(null);
      },
      error: () => {
        alert('Erro ao excluir resposta.');
        this.deletingId.set(null);
      }
    });
  }

  doCancel(id: number) {
    if (!confirm('Deseja cancelar este agendamento?')) return;
    this.cancellingId.set(id);
    this.service.cancelAppointment(id).subscribe({
      next: (updated) => {
        this.appointments.update(list => list.map(a => a.id === id ? updated : a));
        this.cancellingId.set(null);
      },
      error: () => {
        alert('Erro ao cancelar agendamento.');
        this.cancellingId.set(null);
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  getValue(sub: FormSubmission, col: string): string {
    return sub.values?.[col] ?? '-';
  }

  formatLabel(label: string): string {
    return label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatTime(t: string): string {
    return t?.substring(0, 5) ?? '';
  }
}
