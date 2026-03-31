import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormTemplateService, FormTemplate, AppointmentResponse } from '../../core/services/form-template.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
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
  submissionsMap = signal<{ [templateId: number]: any[] }>({}); // 🔥 NOVO

  loading = signal(true);

  // 📊 métricas
  totalAppointments = computed(() =>
    Object.values(this.appointmentsMap()).reduce((acc, list) => acc + list.length, 0)
  );

  templatesWithAppointments = computed(() =>
    Object.values(this.appointmentsMap()).filter(list => list.length > 0).length
  );

  ngOnInit(): void {

    const role = this.auth.role();

    const request$ = role === 'ROLE_ADMIN'
      ? this.service.getAllTemplates()
      : this.service.getMyTemplates();

    request$.subscribe({
      next: (templates) => {

        this.templates.set(templates);

        if (templates.length === 0) {
          this.loading.set(false);
          return;
        }

        // 🔥 AGORA BUSCA OS DOIS
        const calls = templates.map(t =>
          forkJoin({
            appointments: this.service.getAppointmentsByTemplate(t.id),
            submissions: this.service.getSubmissionsByTemplate(t.id)
          })
        );

        forkJoin(calls).subscribe({
          next: (results) => {

            const appMap: { [key: number]: AppointmentResponse[] } = {};
            const subMap: { [key: number]: any[] } = {};

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
}