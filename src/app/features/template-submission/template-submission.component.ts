import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormTemplateService,
  FormTemplate,
  FormSubmission,
} from '../../core/services/form-template.service';
import { signal } from '@angular/core';
import { DatePipe, KeyValuePipe, CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { MessageService } from '../../core/services/message.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-template-submission',
  standalone: true,
  imports: [CommonModule, DatePipe, KeyValuePipe, RouterLink, PageShellComponent, PageHeaderComponent, ConfirmModalComponent],
  templateUrl: './template-submission.component.html',
  styleUrls: ['./template-submission.component.scss'],
})
export class TemplateSubmissionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(FormTemplateService);
  private messages = inject(MessageService);

  public template = signal<FormTemplate | null>(null);
  public submissions = signal<FormSubmission[]>([]);
  public loading = signal<boolean>(true);

  deleteModalOpen = signal(false);
  deleteTargetId = signal<number | null>(null);
  deleting = signal(false);

  openDeleteModal(id: number): void {
    this.deleteTargetId.set(id);
    this.deleteModalOpen.set(true);
  }

  onDeleteConfirmed(): void {
    const id = this.deleteTargetId();
    if (id === null) return;

    this.deleting.set(true);
    this.service.deleteSubmission(id).subscribe({
      next: () => {
        this.submissions.update((list) => list.filter((s) => s.id !== id));
        this.messages.success('Resposta excluída com sucesso');
        this.deleteModalOpen.set(false);
        this.deleting.set(false);
      },
      error: () => {
        this.messages.error('Erro ao excluir resposta');
        this.deleting.set(false);
      },
    });
  }

  onDeleteCancelled(): void {
    this.deleteModalOpen.set(false);
    this.deleteTargetId.set(null);
  }

  ngOnInit(): void {
    this.loading.set(true);

    const rawSlug = this.route.snapshot.paramMap.get('slug');

    if (!rawSlug) {
      console.error('Slug não informado');
      this.loading.set(false);
      return;
    }

    const slug = rawSlug.replace('-list', '');

    this.service.getTemplateBySlug(slug).subscribe({
      next: (t) => {
        this.template.set(t);

        this.service
          .getSubmissionsByTemplate(t.id)
          .pipe(map((p) => p.content))
          .subscribe({
            next: (subs) => {
              this.submissions.set(subs);
              this.loading.set(false);
            },
            error: (err) => {
              console.error('Erro ao carregar submissões', err);
              this.loading.set(false);
            },
          });
      },
      error: (err) => {
        console.error('Erro ao carregar template', err);
        this.loading.set(false);
      },
    });
  }
}
