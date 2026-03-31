import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormTemplateService, FormTemplate, AppointmentResponse, FormSubmission } from '../../core/services/form-template.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { DatePipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-forms-all',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './forms-all.component.html',
  styleUrls: ['./forms-all.component.scss']
})
export class FormsAllComponent implements OnInit {

  private service = inject(FormTemplateService);
  private auth = inject(AuthService);

  templates = signal<FormTemplate[]>([]);
  appointmentsMap = signal<{ [templateId: number]: AppointmentResponse[] }>({});
  submissionsMap = signal<{ [templateId: number]: FormSubmission[] }>({});
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

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading.set(true);

    const role = this.auth.role();

    const request$ = role === 'ROLE_ADMIN'
      ? this.service.getAllTemplates(this.page(), this.size)
      : this.service.getMyTemplates(this.page(), this.size);

    request$.subscribe({
      next: (pageRes) => {
        const templates = pageRes.content;
        this.templates.set(templates);
        this.totalPages.set(pageRes.totalPages);
        this.totalElements.set(pageRes.totalElements);

        if (templates.length === 0) {
          this.loading.set(false);
          return;
        }

        // Busca appointments e submissions (size=5 para preview no card)
        const calls = templates.map(t =>
          forkJoin({
            appointments: this.service.getAppointmentsByTemplate(t.id, 0, 5).pipe(map(p => p.content)),
            submissions: this.service.getSubmissionsByTemplate(t.id, 0, 5).pipe(map(p => p.content))
          })
        );

        forkJoin(calls).subscribe({
          next: (results) => {
            const appMap: { [key: number]: AppointmentResponse[] } = {};
            const subMap: { [key: number]: FormSubmission[] } = {};

            templates.forEach((t, index) => {
              appMap[t.id] = results[index].appointments;
              subMap[t.id] = results[index].submissions;
            });

            this.appointmentsMap.set(appMap);
            this.submissionsMap.set(subMap);
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Erro ao buscar dados:', err);
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Erro ao buscar templates:', err);
        this.loading.set(false);
      }
    });
  }

  nextPage() {
    if (this.page() < this.totalPages() - 1) {
      this.page.update(p => p + 1);
      this.loadTemplates();
    }
  }

  prevPage() {
    if (this.page() > 0) {
      this.page.update(p => p - 1);
      this.loadTemplates();
    }
  }
}
