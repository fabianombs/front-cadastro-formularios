import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SurveyService, SurveyConfig } from '../../core/services/survey.service';

type SurveyStep = 'loading' | 'welcome' | 'rating' | 'thankyou' | 'error';

interface ScoreOption {
  score: number;
  label: string;
  emoji: string;
  color: string;
  borderColor: string;
}

@Component({
  selector: 'app-survey-public',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './survey-public.component.html',
  styleUrls: ['./survey-public.component.scss'],
})
export class SurveyPublicComponent implements OnInit {
  private route         = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);

  step    = signal<SurveyStep>('loading');
  survey  = signal<SurveyConfig | null>(null);
  errorMsg = signal('');

  selectedScore = signal<number | null>(null);
  comment       = '';
  submitting    = signal(false);

  // Parâmetros opcionais passados via query params quando a pesquisa é disparada
  // ao final do fluxo de outro template (ex: ?ref=João&source=evento-2024)
  respondentRef       = '';
  sourceTemplateSlug  = '';

  // Aparência dinâmica baseada na config da pesquisa
  bgStyle = computed(() => {
    const s = this.survey();
    if (!s) return 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 50%, #162d4a 100%)';
    if (s.backgroundImageUrl) return `url('${s.backgroundImageUrl}') center/cover no-repeat`;
    if (s.backgroundGradient) return s.backgroundGradient;
    if (s.backgroundColor)    return s.backgroundColor;
    return 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 50%, #162d4a 100%)';
  });

  btnBg   = computed(() => this.survey()?.buttonColor || this.survey()?.primaryColor || '#3b82f6');
  btnText = computed(() => this.survey()?.buttonTextColor || '#ffffff');
  textClr = computed(() => this.survey()?.textColor || '#ffffff');
  cardBg  = computed(() => this.survey()?.cardColor || 'rgba(255,255,255,0.07)');
  logoRadius = computed(() => this.survey()?.logoBorderRadius || '8px');

  // Posições livres (usa defaults se não configurado)
  logoPosX  = computed(() => this.survey()?.logoPosX  ?? 50);
  logoPosY  = computed(() => this.survey()?.logoPosY  ?? 12);
  logoWidth = computed(() => this.survey()?.logoWidth ?? 120);
  cardPosX  = computed(() => this.survey()?.cardPosX  ?? 50);
  cardPosY  = computed(() => this.survey()?.cardPosY  ?? 55);

  // Visibilidade do logo por tela
  showLogoWelcome  = computed(() => this.survey()?.showLogoWelcome  !== false);
  showLogoRating   = computed(() => this.survey()?.showLogoRating   !== false);
  showLogoThankyou = computed(() => this.survey()?.showLogoThankyou !== false);

  // Ícone do score: imagem customizada ou null (componente usa emoji)
  scoreIcon(score: number): string | null {
    const s = this.survey();
    if (!s) return null;
    return (s as any)[`score${score}ImageUrl`] || null;
  }

  // Label do score: customizado ou padrão
  scoreLabel(score: number, defaultLabel: string): string {
    const s = this.survey();
    if (!s) return defaultLabel;
    return (s as any)[`score${score}Label`] || defaultLabel;
  }

  welcomeSubtitle  = computed(() => this.survey()?.welcomeSubtitle  ?? 'Sua opinião é muito importante para nós!');
  thankyouSubtitle = computed(() => this.survey()?.thankyouSubtitle ?? 'Avaliação registrada com sucesso.');
  welcomeBtnText   = computed(() => this.survey()?.welcomeBtnText   ?? 'Começar');
  ratingBtnText    = computed(() => this.survey()?.ratingBtnText    ?? 'Enviar avaliação');

  readonly scoreOptions: ScoreOption[] = [
    { score: 5, label: 'Muito Satisfeito',   emoji: '😊', color: '#22c55e', borderColor: '#16a34a' },
    { score: 4, label: 'Satisfeito',          emoji: '🙂', color: '#86efac', borderColor: '#22c55e' },
    { score: 3, label: 'Regular',             emoji: '😐', color: '#facc15', borderColor: '#ca8a04' },
    { score: 2, label: 'Insatisfeito',        emoji: '😕', color: '#fb923c', borderColor: '#ea580c' },
    { score: 1, label: 'Muito Insatisfeito',  emoji: '😞', color: '#ef4444', borderColor: '#dc2626' },
  ];

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const params = this.route.snapshot.queryParamMap;
    this.respondentRef      = params.get('ref')    ?? '';
    this.sourceTemplateSlug = params.get('source') ?? '';

    this.surveyService.getBySlug(slug).subscribe({
      next: (s) => {
        this.survey.set(s);
        this.step.set('welcome');
      },
      error: () => {
        this.errorMsg.set('Pesquisa não encontrada ou inativa.');
        this.step.set('error');
      },
    });
  }

  start(): void {
    this.step.set('rating');
  }

  selectScore(score: number): void {
    this.selectedScore.set(score);
  }

  submit(): void {
    const score = this.selectedScore();
    const survey = this.survey();
    if (!score || !survey || this.submitting()) return;

    this.submitting.set(true);

    this.surveyService.submitResponse(survey.slug, {
      score,
      comment:             this.comment || undefined,
      respondentRef:       this.respondentRef || undefined,
      sourceTemplateSlug:  this.sourceTemplateSlug || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.step.set('thankyou');
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }

  getSelectedOption(): ScoreOption | undefined {
    return this.scoreOptions.find(o => o.score === this.selectedScore());
  }
}
