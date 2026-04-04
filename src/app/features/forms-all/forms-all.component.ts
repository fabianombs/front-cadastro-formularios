import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DashboardService, DashboardSummary, TemplateStatResponse } from '../../core/services/dashboard.service';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  PaginationComponent,
  SpringPage,
} from '../../shared/components/pagination/pagination.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';

@Component({
  selector: 'app-forms-all',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationComponent, PageShellComponent, PageHeaderComponent],
  templateUrl: './forms-all.component.html',
  styleUrls: ['./forms-all.component.scss'],
})
export class FormsAllComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  templates = signal<TemplateStatResponse[]>([]);
  loading = signal(true);

  page = signal(0);
  readonly size = 10;
  totalPages = signal(0);
  totalElements = signal(0);
  summary = signal<DashboardSummary | null>(null);

  globalScheduleCount = computed(() => this.summary()?.appointmentTemplateCount ?? 0);
  globalAttendanceCount = computed(() => this.summary()?.attendanceTemplateCount ?? 0);
  globalFormCount = computed(() => this.summary()?.formTemplateCount ?? 0);

  templatesPagination = computed<SpringPage>(() => ({
    page: this.page(),
    size: this.size,
    totalElements: this.totalElements(),
    totalPages: this.totalPages(),
  }));

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading.set(true);

    this.dashboardService.getSummary(this.page(), this.size).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.templates.set(summary.templates ?? []);
        this.totalPages.set(summary.totalPages);
        this.totalElements.set(summary.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar formulários:', err);
        this.loading.set(false);
      },
    });
  }

  isAttendanceCard(template: TemplateStatResponse): boolean {
    return !template.hasSchedule && template.attendanceTotal > 0;
  }

  isFormCard(template: TemplateStatResponse): boolean {
    return !template.hasSchedule && template.attendanceTotal === 0;
  }

  goToPage(n: number): void {
    this.page.set(n);
    this.loadTemplates();
  }

  deleteTemplate(id: number, $event: Event): void {
    if (confirm('Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita.')) {
      console.log('ID DO CARD', id);
      console.log('EVENTO DO CARD', $event);
    }
  }
}
