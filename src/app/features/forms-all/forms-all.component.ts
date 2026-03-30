import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormTemplateService, FormTemplate, FormSubmission } from '../../core/services/form-template.service';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-forms-all',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './forms-all.component.html',
  styleUrls: ['./forms-all.component.scss']
})
export class FormsAllComponent implements OnInit {

  private service = inject(FormTemplateService);
  private auth = inject(AuthService);

  templates = signal<FormTemplate[]>([]);
  submissionsMap = signal<{ [templateId: number]: FormSubmission[] }>({});
  loading = signal(true);

  totalSubmissions = computed(() =>
    Object.values(this.submissionsMap()).reduce((acc, subs) => acc + subs.length, 0)
  );

  templatesWithResponses = computed(() =>
    Object.values(this.submissionsMap()).filter(subs => subs.length > 0).length
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

        const calls = templates.map(t =>
          this.service.getSubmissionsByTemplate(t.id)
        );

        forkJoin(calls).subscribe({
          next: (results) => {

            const map: { [key: number]: FormSubmission[] } = {};

            templates.forEach((t, index) => {
              map[t.id] = results[index];
            });

            this.submissionsMap.set(map);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }
}