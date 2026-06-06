import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SurveyService, SurveyConfig } from '../../core/services/survey.service';
import { normalizeQuizLink } from '../../core/services/quiz.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-survey-library',
  standalone: true,
  imports: [CommonModule, PageShellComponent, PageHeaderComponent],
  templateUrl: './survey-library.component.html',
  styleUrls: ['./survey-library.component.scss'],
})
export class SurveyLibraryComponent implements OnInit {
  private surveyService = inject(SurveyService);
  private router        = inject(Router);

  surveys    = signal<SurveyConfig[]>([]);
  loading    = signal(true);
  expandedId = signal<number | null>(null);
  deletingId = signal<number | null>(null);

  ngOnInit() { this.loadSurveys(); }

  loadSurveys() {
    this.loading.set(true);
    this.surveyService.listAll().subscribe({
      next: (list) => {
          // Normaliza os links para usar o domínio atual (corrige localhost em prod)
          const normalized = list.map(s => ({
            ...s,
            publicLink: normalizeQuizLink(s.publicLink) ?? undefined,
            reportLink: normalizeQuizLink(s.reportLink) ?? undefined,
          }));
          this.surveys.set(normalized);
          this.loading.set(false);
        },
      error: () => this.loading.set(false),
    });
  }

  openCreate() { this.router.navigate(['/surveys/new']); }
  openEdit(s: SurveyConfig) { this.router.navigate(['/surveys', s.id, 'edit']); }

  toggleExpanded(id: number) {
    this.expandedId.update(cur => cur === id ? null : id);
  }

  toggleActive(s: SurveyConfig) {
    this.surveyService.toggleActive(s.id).subscribe({
      next: (updated) => this.surveys.update(list => list.map(x => x.id === updated.id ? updated : x)),
    });
  }

  confirmDelete(id: number) { this.deletingId.set(id); }
  cancelDelete() { this.deletingId.set(null); }

  deleteSurvey(id: number) {
    this.surveyService.delete(id).subscribe({
      next: () => { this.deletingId.set(null); this.loadSurveys(); },
    });
  }

  copyLink(link: string | null | undefined) {
    if (link) navigator.clipboard.writeText(link);
  }

  openReport(s: SurveyConfig) {
    window.open(s.reportLink, '_blank');
  }
}
