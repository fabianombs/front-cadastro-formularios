import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormTemplateService, FormTemplate, FormSubmission } from '../../core/services/form-template.service';
import { signal } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-template-submission',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './template-submission.component.html',
  styleUrls: ['./template-submission.component.scss']
})
export class TemplateSubmissionComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private service = inject(FormTemplateService);

  public template = signal<FormTemplate | null>(null);
  public submissions = signal<FormSubmission[]>([]);
  public loading = signal<boolean>(true);

  constructor() {}

  ngOnInit(): void {
    this.loading.set(true);

    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      console.error('Slug não informado');
      this.loading.set(false);
      return;
    }

    // Buscar template pelo slug
    this.service.getTemplateBySlug(slug).subscribe({
      next: (t) => {
        this.template.set(t);

        // Buscar submissões do template
        this.service.getSubmissions(t.id).subscribe({
          next: (subs) => {
            this.submissions.set(subs);
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Erro ao carregar submissões', err);
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Erro ao carregar template', err);
        this.loading.set(false);
      }
    });
  }
}