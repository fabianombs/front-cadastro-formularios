import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SurveyService, SurveyReport, SurveyConfig } from '../../core/services/survey.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-survey-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './survey-report.component.html',
  styleUrls: ['./survey-report.component.scss'],
})
export class SurveyReportComponent implements OnInit {
  private route         = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);
  private exportService = inject(ExportService);

  loading = signal(true);
  survey  = signal<SurveyConfig | null>(null);
  report  = signal<SurveyReport | null>(null);
  errorMsg = signal('');

  // Mapa de cores por label de score
  readonly scoreColors: Record<string, string> = {
    'Muito Satisfeito':   '#22c55e',
    'Satisfeito':         '#86efac',
    'Regular':            '#facc15',
    'Insatisfeito':       '#fb923c',
    'Muito Insatisfeito': '#ef4444',
  };

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';

    // Carrega a config pública para ter o ID
    this.surveyService.getBySlug(slug).subscribe({
      next: (s) => {
        this.survey.set(s);
        this.loadReport(s.id);
      },
      error: () => {
        this.errorMsg.set('Pesquisa não encontrada.');
        this.loading.set(false);
      },
    });
  }

  private loadReport(id: number): void {
    this.surveyService.getReport(id).subscribe({
      next: (r) => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Erro ao carregar relatório.');
        this.loading.set(false);
      },
    });
  }

  get scoreEntries(): { label: string; count: number; pct: number }[] {
    const r = this.report();
    if (!r) return [];
    const total = r.totalResponses || 1;
    return Object.entries(r.scoreDistribution).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100),
    }));
  }

  get averageStars(): string {
    const avg = this.report()?.averageScore ?? 0;
    return avg.toFixed(1);
  }

  exportExcel(): void {
    const r = this.report();
    const s = this.survey();
    if (!r || !s) return;
    this.exportService.exportSurvey(r, s.name);
  }

  copyPublicLink(): void {
    const s = this.survey();
    if (!s?.publicLink) return;
    navigator.clipboard.writeText(s.publicLink);
  }
}
