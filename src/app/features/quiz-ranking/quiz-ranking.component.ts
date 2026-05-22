import { Component, OnInit, OnDestroy, signal, computed, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QuizService, RankingResponse, QuizSession, QuizConfig } from '../../core/services/quiz.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-quiz-ranking',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './quiz-ranking.component.html',
  styleUrls: ['./quiz-ranking.component.scss'],
})
export class QuizRankingComponent implements OnInit, OnDestroy {
  private route         = inject(ActivatedRoute);
  private quizService   = inject(QuizService);
  private exportService = inject(ExportService);
  private hostEl        = inject(ElementRef);

  ranking    = signal<RankingResponse | null>(null);
  quizConfig = signal<QuizConfig | null>(null);
  loading    = signal(true);
  slug = '';

  private refreshInterval: any = null;

  // ── Aparência — mesmos sinais da tela pública ─────────────────────────────

  quizBg = computed(() => {
    const q = this.quizConfig();
    if (!q) return '#0d1117';
    if (q.backgroundImageUrl) return `url('${q.backgroundImageUrl}') center/cover no-repeat`;
    if (q.backgroundGradient) return q.backgroundGradient;
    if (q.backgroundColor)    return q.backgroundColor;
    return '#0d1117';
  });

  quizPrimary = computed(() => this.quizConfig()?.primaryColor || '#5b8dee');
  quizText    = computed(() => this.quizConfig()?.textColor    || '#e2e8f0');

  podium = computed<QuizSession[]>(() => (this.ranking()?.top ?? []).slice(0, 3));
  rest   = computed<QuizSession[]>(() => (this.ranking()?.top ?? []).slice(3));

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';

    // Carrega aparência do quiz para aplicar o mesmo tema da tela pública
    this.quizService.getQuizBySlug(this.slug).subscribe({
      next: (quiz) => {
        this.quizConfig.set(quiz);
        this.applyAppearance(quiz);
      },
    });

    this.load();
    this.refreshInterval = setInterval(() => this.load(), 15000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  load() {
    this.quizService.getRanking(this.slug, 10).subscribe({
      next: (r) => { this.ranking.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  medal(pos: number): string {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `${pos}`;
  }

  exportExcel(): void {
    const r = this.ranking();
    if (!r) return;
    this.exportService.exportRanking(r, r.templateName);
  }

  // CSS vars para que o SCSS possa usar var(--qprimary) e var(--qtext)
  private applyAppearance(quiz: QuizConfig) {
    const el: HTMLElement = this.hostEl.nativeElement;
    if (quiz.primaryColor) el.style.setProperty('--qprimary', quiz.primaryColor);
    if (quiz.textColor)    el.style.setProperty('--qtext',    quiz.textColor);
  }
}
