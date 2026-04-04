import { Component, OnInit, inject, signal, computed } from '@angular/core';
import {
  FormTemplateService,
  FormTemplate,
  AppointmentResponse,
  FormSubmission,
  AttendanceRecord,
} from '../../core/services/form-template.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { forkJoin, EMPTY, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { DatePipe, CommonModule } from '@angular/common';
import {
  PaginationComponent,
  SpringPage,
} from '../../shared/components/pagination/pagination.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';

@Component({
  selector: 'app-forms-all',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, PaginationComponent, PageShellComponent, PageHeaderComponent],
  templateUrl: './forms-all.component.html',
  styleUrls: ['./forms-all.component.scss'],
})
export class FormsAllComponent implements OnInit {
  private service = inject(FormTemplateService);
  private auth = inject(AuthService);

  templates = signal<FormTemplate[]>([]);
  appointmentsMap = signal<{ [templateId: number]: AppointmentResponse[] }>({});
  submissionsMap = signal<{ [templateId: number]: FormSubmission[] }>({});
  attendanceMap = signal<{ [templateId: number]: AttendanceRecord[] }>({});
  loading = signal(true);

  page = signal(0);
  readonly size = 10;
  totalPages = signal(0);
  totalElements = signal(0);

  // Carregado uma vez — não muda com paginação
  private globalTemplates = signal<FormTemplate[]>([]);

  // Setado após verificar registros de presença (hasAttendance pode ser false mesmo com registros)
  globalAttendanceCount = signal(0);

  globalScheduleCount = computed(() => this.globalTemplates().filter((t) => t.hasSchedule).length);

  // Formulários puros: não são agenda nem presença
  // O valor é derivado após globalAttendanceCount ser setado
  globalFormCount = signal(0);

  presentesMap = computed(() => {
    const result: { [id: number]: number } = {};
    for (const [id, records] of Object.entries(this.attendanceMap())) {
      result[+id] = records.filter((r) => r.attended).length;
    }
    return result;
  });

  templatesPagination = computed<SpringPage>(() => ({
    page: this.page(),
    size: this.size,
    totalElements: this.totalElements(),
    totalPages: this.totalPages(),
  }));

  ngOnInit(): void {
    this.loadGlobalTemplates();
    this.loadTemplates();
  }

  // Busca todos os templates uma vez para calcular stats globais.
  // Para templates sem hasSchedule, verifica se têm registros de presença (fallback),
  // pois hasAttendance pode estar false mesmo com registros importados.
  loadGlobalTemplates(): void {
    const role = this.auth.role();
    const request$ =
      role === 'ROLE_ADMIN'
        ? this.service.getAllTemplates(0, 99999)
        : this.service.getMyTemplates(0, 99999);

    request$
      .pipe(
        switchMap((pageRes) => {
          const templates = pageRes.content;
          this.globalTemplates.set(templates);

          const toCheck = templates.filter((t) => !t.hasSchedule && !t.hasAttendance);
          if (toCheck.length === 0) {
            const attCount = templates.filter((t) => !t.hasSchedule && t.hasAttendance).length;
            this.globalAttendanceCount.set(attCount);
            const formCount = templates.filter((t) => !t.hasSchedule && !t.hasAttendance).length;
            this.globalFormCount.set(formCount);
            return EMPTY;
          }

          return forkJoin(
            toCheck.map((t) =>
              this.service.getAttendance(t.id, 0, 1).pipe(map((page) => page.content.length > 0)),
            ),
          ).pipe(map((hasRecords) => ({ templates, hasRecords })));
        }),
      )
      .subscribe({
        next: ({ templates, hasRecords }) => {
          const toCheck = templates.filter((t) => !t.hasSchedule && !t.hasAttendance);
          const withRecordsIds = new Set(toCheck.filter((_, i) => hasRecords[i]).map((t) => t.id));
          const attCount = templates.filter(
            (t) => !t.hasSchedule && (t.hasAttendance || withRecordsIds.has(t.id)),
          ).length;
          this.globalAttendanceCount.set(attCount);

          const formCount = templates.filter(
            (t) => !t.hasSchedule && !t.hasAttendance && !withRecordsIds.has(t.id),
          ).length;
          this.globalFormCount.set(formCount);
        },
      });
  }

  loadTemplates(): void {
    this.loading.set(true);

    const role = this.auth.role();

    const request$ =
      role === 'ROLE_ADMIN'
        ? this.service.getAllTemplates(this.page(), this.size)
        : this.service.getMyTemplates(this.page(), this.size);

    request$
      .pipe(
        switchMap((pageRes) => {
          const templates = pageRes.content;
          this.templates.set(templates);
          this.totalPages.set(pageRes.totalPages);
          this.totalElements.set(pageRes.totalElements);

          if (templates.length === 0) {
            this.loading.set(false);
            return EMPTY;
          }

          // Busca apenas os dados necessários para cada tipo de card
          const calls = templates.map((t) => {
            if (t.hasSchedule) {
              return forkJoin({
                appointments: this.service
                  .getAppointmentsByTemplate(t.id, 0, 5)
                  .pipe(map((p) => p.content)),
                submissions: of<FormSubmission[]>([]),
                attendance: of<AttendanceRecord[]>([]),
              });
            }
            if (t.hasAttendance) {
              return forkJoin({
                appointments: of<AppointmentResponse[]>([]),
                submissions: of<FormSubmission[]>([]),
                attendance: this.service.getAttendance(t.id, 0, 10).pipe(map((p) => p.content)),
              });
            }
            // Carrega submissions e attendance para detectar presença como fallback
            return forkJoin({
              appointments: of<AppointmentResponse[]>([]),
              submissions: this.service
                .getSubmissionsByTemplate(t.id, 0, 5)
                .pipe(map((p) => p.content)),
              attendance: this.service.getAttendance(t.id, 0, 10).pipe(map((p) => p.content)),
            });
          });

          return forkJoin(calls).pipe(map((results) => ({ templates, results })));
        }),
      )
      .subscribe({
        next: ({ templates, results }) => {
          const appMap: { [key: number]: AppointmentResponse[] } = {};
          const subMap: { [key: number]: FormSubmission[] } = {};
          const attMap: { [key: number]: AttendanceRecord[] } = {};

          templates.forEach((t, index) => {
            appMap[t.id] = results[index].appointments;
            subMap[t.id] = results[index].submissions;
            attMap[t.id] = results[index].attendance;
          });

          this.appointmentsMap.set(appMap);
          this.submissionsMap.set(subMap);
          this.attendanceMap.set(attMap);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erro ao buscar dados:', err);
          this.loading.set(false);
        },
      });
  }

  goToPage(n: number): void {
    this.page.set(n);
    this.loadTemplates();
  }

  deleteTemplate(id: number, $event: Event): void {
    if (confirm('Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita.')) {
      console.log("ID DO CARD", id);
      console.log("EVENTO DO CARD", $event);
      
      // this.service.deleteTemplate(id).subscribe({
      //   next: () => {
      //     this.loadTemplates();
      //   },
      //   error: (err) => {
      //     console.error('Erro ao excluir formulário:', err);
      //   }
      // });
    }
  }
}
