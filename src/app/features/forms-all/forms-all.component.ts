import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormTemplateService, FormTemplate, AppointmentResponse, FormSubmission, AttendanceRecord } from '../../core/services/form-template.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { forkJoin, EMPTY, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { DatePipe, CommonModule } from '@angular/common';
import { PaginationComponent, SpringPage } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-forms-all',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, PaginationComponent],
  templateUrl: './forms-all.component.html',
  styleUrls: ['./forms-all.component.scss']
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
  readonly size = 12;
  totalPages = signal(0);
  totalElements = signal(0);

  totalAppointments = computed(() =>
    Object.values(this.appointmentsMap()).reduce((acc, list) => acc + list.length, 0)
  );

  templatesWithAppointments = computed(() =>
    Object.values(this.appointmentsMap()).filter(list => list.length > 0).length
  );

  presentesMap = computed(() => {
    const result: { [id: number]: number } = {};
    for (const [id, records] of Object.entries(this.attendanceMap())) {
      result[+id] = records.filter(r => r.attended).length;
    }
    return result;
  });

  templatesPagination = computed<SpringPage>(() => ({
    page: this.page(),
    size: this.size,
    totalElements: this.totalElements(),
    totalPages: this.totalPages()
  }));

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading.set(true);

    const role = this.auth.role();

    const request$ = role === 'ROLE_ADMIN'
      ? this.service.getAllTemplates(this.page(), this.size)
      : this.service.getMyTemplates(this.page(), this.size);

    request$.pipe(
      switchMap(pageRes => {
        const templates = pageRes.content;
        this.templates.set(templates);
        this.totalPages.set(pageRes.totalPages);
        this.totalElements.set(pageRes.totalElements);

        if (templates.length === 0) {
          this.loading.set(false);
          return EMPTY;
        }

        // Busca apenas os dados necessários para cada tipo de card
        const calls = templates.map(t => {
          if (t.hasSchedule) {
            return forkJoin({
              appointments: this.service.getAppointmentsByTemplate(t.id, 0, 5).pipe(map(p => p.content)),
              submissions: of<FormSubmission[]>([]),
              attendance: of<AttendanceRecord[]>([])
            });
          }
          if (t.hasAttendance) {
            return forkJoin({
              appointments: of<AppointmentResponse[]>([]),
              submissions: of<FormSubmission[]>([]),
              attendance: this.service.getAttendance(t.id, 0, 10).pipe(map(p => p.content))
            });
          }
          // Carrega submissions e attendance para detectar presença como fallback
          return forkJoin({
            appointments: of<AppointmentResponse[]>([]),
            submissions: this.service.getSubmissionsByTemplate(t.id, 0, 5).pipe(map(p => p.content)),
            attendance: this.service.getAttendance(t.id, 0, 10).pipe(map(p => p.content))
          });
        });

        return forkJoin(calls).pipe(map(results => ({ templates, results })));
      })
    ).subscribe({
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
      }
    });
  }

  goToPage(n: number): void {
    this.page.set(n);
    this.loadTemplates();
  }
}
