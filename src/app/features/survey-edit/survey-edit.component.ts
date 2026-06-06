import {
  Component, OnInit, signal, computed, inject, HostListener, DestroyRef, ElementRef, ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SurveyService, SurveyConfig } from '../../core/services/survey.service';

@Component({
  selector: 'app-survey-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './survey-edit.component.html',
  styleUrls: ['./survey-edit.component.scss'],
})
export class SurveyEditComponent implements OnInit {
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private surveyService = inject(SurveyService);
  private fb            = inject(FormBuilder);
  private destroyRef    = inject(DestroyRef);

  survey    = signal<SurveyConfig | null>(null);
  loading   = signal(true);
  saving    = signal(false);
  uploading = signal(false);
  saved     = signal(false);
  dragOver  = signal(false);

  // Aba ativa: 'content' | 'appearance'
  activeTab = signal<'content' | 'appearance'>('content');

  // Tela do preview: 'welcome' | 'rating' | 'thankyou'
  previewScreen = signal<'welcome' | 'rating' | 'thankyou'>('welcome');

  isCreateMode = false;

  surveyForm!: FormGroup;

  // Espelho reativo do form para computed() reagirem
  private formSnapshot = signal<Record<string, any>>({});

  readonly scoreOptions = [
    { score: 5, label: 'Muito Satisfeito',   emoji: '😊', defaultColor: '#22c55e' },
    { score: 4, label: 'Satisfeito',          emoji: '🙂', defaultColor: '#86efac' },
    { score: 3, label: 'Regular',             emoji: '😐', defaultColor: '#facc15' },
    { score: 2, label: 'Insatisfeito',        emoji: '😕', defaultColor: '#fb923c' },
    { score: 1, label: 'Muito Insatisfeito',  emoji: '😞', defaultColor: '#ef4444' },
  ];

  readonly gradientPresets = [
    { label: 'Noite Profunda',  value: 'linear-gradient(135deg,#0d1117,#1a1a2e)' },
    { label: 'Oceano',          value: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)' },
    { label: 'Roxo Espacial',   value: 'linear-gradient(135deg,#200122,#6f0000)' },
    { label: 'Floresta',        value: 'linear-gradient(135deg,#0a3d0a,#1e6b1e)' },
    { label: 'Pôr do sol',      value: 'linear-gradient(135deg,#f7971e,#ffd200)' },
    { label: 'Aurora',          value: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
    { label: 'Rosa Suave',      value: 'linear-gradient(135deg,#f093fb,#f5576c)' },
    { label: 'Esmeralda',       value: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  ];

  ngOnInit() {
    const rawId = this.route.snapshot.paramMap.get('id');

    if (!rawId) {
      this.isCreateMode = true;
      this.initForm({} as SurveyConfig);
      this.loading.set(false);
      return;
    }

    this.surveyService.getById(Number(rawId)).subscribe({
      next: (s) => {
        this.survey.set(s);
        this.initForm(s);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/surveys']);
      },
    });
  }

  private initForm(s: Partial<SurveyConfig>) {
    this.surveyForm = this.fb.group({
      name:         [s.name         ?? '', Validators.required],
      slug:         [s.slug         ?? ''],
      companyName:  [s.companyName  ?? ''],
      companyLogoUrl: [s.companyLogoUrl ?? ''],
      welcomeTitle: [s.welcomeTitle ?? 'Como foi sua experiência?', Validators.required],
      questionText: [s.questionText ?? 'Quão satisfeito você está com nosso serviço hoje?', Validators.required],
      showComment:  [s.showComment  ?? false],
      thankYouMsg:  [s.thankYouMsg  ?? 'Muito obrigado pela sua avaliação!', Validators.required],
      // Aparência
      backgroundColor:    [s.backgroundColor    ?? null],
      backgroundGradient: [s.backgroundGradient ?? null],
      backgroundImageUrl: [s.backgroundImageUrl ?? null],
      primaryColor:       [s.primaryColor       ?? null],
      textColor:          [s.textColor          ?? null],
      cardColor:          [s.cardColor          ?? null],
      buttonColor:        [s.buttonColor        ?? null],
      buttonTextColor:    [s.buttonTextColor    ?? null],
      logoBorderRadius:   [s.logoBorderRadius   ?? '8px'],
      // Posições livres
      logoPosX:  [s.logoPosX  ?? 50],
      logoPosY:  [s.logoPosY  ?? 12],
      logoWidth: [s.logoWidth ?? 120],
      cardPosX:  [s.cardPosX  ?? 50],
      cardPosY:  [s.cardPosY  ?? 55],
      // Visibilidade do logo por tela
      showLogoWelcome:  [s.showLogoWelcome  ?? true],
      showLogoRating:   [s.showLogoRating   ?? true],
      showLogoThankyou: [s.showLogoThankyou ?? true],
      // Ícones customizados
      score5ImageUrl: [s.score5ImageUrl ?? null],
      score4ImageUrl: [s.score4ImageUrl ?? null],
      score3ImageUrl: [s.score3ImageUrl ?? null],
      score2ImageUrl: [s.score2ImageUrl ?? null],
      score1ImageUrl: [s.score1ImageUrl ?? null],
      // Labels editáveis
      score5Label: [s.score5Label ?? 'Muito Satisfeito'],
      score4Label: [s.score4Label ?? 'Satisfeito'],
      score3Label: [s.score3Label ?? 'Regular'],
      score2Label: [s.score2Label ?? 'Insatisfeito'],
      score1Label: [s.score1Label ?? 'Muito Insatisfeito'],
      // Subtítulos e botões
      welcomeSubtitle:  [s.welcomeSubtitle  ?? 'Sua opinião é muito importante para nós!'],
      thankyouSubtitle: [s.thankyouSubtitle ?? 'Avaliação registrada com sucesso.'],
      welcomeBtnText:   [s.welcomeBtnText   ?? 'Começar'],
      ratingBtnText:    [s.ratingBtnText    ?? 'Enviar avaliação'],
    });

    // Inicializa signals de posição com valores do survey carregado
    this.logoPosX.set(s.logoPosX  ?? 50);
    this.logoPosY.set(s.logoPosY  ?? 12);
    this.logoWidth.set(s.logoWidth ?? 120);
    this.cardPosX.set(s.cardPosX  ?? 50);
    this.cardPosY.set(s.cardPosY  ?? 55);

    this.formSnapshot.set(this.surveyForm.value);
    this.surveyForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.formSnapshot.set(v));
  }

  // ── Preview computed ──────────────────────────────────────────────────────

  previewBg = computed(() => {
    const v = this.formSnapshot();
    if (v['backgroundImageUrl']) return `url('${v['backgroundImageUrl']}') center/cover no-repeat`;
    if (v['backgroundGradient']) return v['backgroundGradient'];
    if (v['backgroundColor'])    return v['backgroundColor'];
    return 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 50%, #162d4a 100%)';
  });

  previewPrimary    = computed(() => this.formSnapshot()['primaryColor']    || '#3b82f6');
  previewText       = computed(() => this.formSnapshot()['textColor']       || '#ffffff');
  previewCardBg     = computed(() => this.formSnapshot()['cardColor']       || 'rgba(255,255,255,0.07)');
  previewButtonBg   = computed(() => this.formSnapshot()['buttonColor']     || this.formSnapshot()['primaryColor'] || '#3b82f6');
  previewButtonText = computed(() => this.formSnapshot()['buttonTextColor'] || '#ffffff');
  previewLogoRadius    = computed(() => this.formSnapshot()['logoBorderRadius'] || '8px');
  previewCompanyName   = computed(() => this.formSnapshot()['companyName'] || '');
  previewLogoUrl       = computed(() => this.formSnapshot()['companyLogoUrl'] || '');
  previewShowWelcome   = computed(() => this.formSnapshot()['showLogoWelcome']  !== false);
  previewShowRating    = computed(() => this.formSnapshot()['showLogoRating']   !== false);
  previewShowThankyou  = computed(() => this.formSnapshot()['showLogoThankyou'] !== false);

  // Retorna URL customizada ou null (para usar emoji) para cada score
  previewScoreIcon(score: number): string | null {
    return this.formSnapshot()[`score${score}ImageUrl`] || null;
  }
  previewWelcomeTitle    = computed(() => this.formSnapshot()['welcomeTitle']    || 'Como foi sua experiência?');
  previewWelcomeSubtitle = computed(() => this.formSnapshot()['welcomeSubtitle']  || 'Sua opinião é muito importante!');
  previewWelcomeBtn      = computed(() => this.formSnapshot()['welcomeBtnText']   || 'Começar');
  previewQuestionText    = computed(() => this.formSnapshot()['questionText']     || 'Quão satisfeito você está com nosso serviço hoje?');
  previewRatingBtn       = computed(() => this.formSnapshot()['ratingBtnText']    || 'Enviar avaliação');
  previewThankYouMsg     = computed(() => this.formSnapshot()['thankYouMsg']      || 'Muito obrigado pela sua avaliação!');
  previewThankyouSub     = computed(() => this.formSnapshot()['thankyouSubtitle'] || 'Avaliação registrada com sucesso.');

  previewScoreLabel(score: number): string {
    return this.formSnapshot()[`score${score}Label`] || this.scoreOptions.find(o => o.score === score)?.label || '';
  }

  // ── Aparência helpers ─────────────────────────────────────────────────────

  clearField(field: string) {
    this.surveyForm.get(field)?.setValue(null);
  }

  applyGradient(value: string) {
    this.surveyForm.get('backgroundGradient')?.setValue(value);
    this.surveyForm.get('backgroundColor')?.setValue(null);
    this.surveyForm.get('backgroundImageUrl')?.setValue(null);
  }

  uploadingLogo  = signal(false);
  uploadingScore = signal<number | null>(null); // score que está sendo enviado (1-5)

  // Upload de ícone para um score específico
  onScoreIconFileSelect(score: number, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.uploadScoreIcon(score, input.files[0]);
  }

  uploadScoreIcon(score: number, file: File) {
    if (!file.type.startsWith('image/')) return;
    this.uploadingScore.set(score);
    this.surveyService.uploadImage(file).subscribe({
      next: (res) => {
        const field = `score${score}ImageUrl`;
        this.surveyForm.get(field)?.setValue(res.url);
        this.uploadingScore.set(null);
      },
      error: () => this.uploadingScore.set(null),
    });
  }

  clearScoreIcon(score: number) {
    this.surveyForm.get(`score${score}ImageUrl`)?.setValue(null);
  }

  // ── Drag & Drop state ─────────────────────────────────────────────────────

  @ViewChild('previewContainer') previewContainerRef!: ElementRef<HTMLElement>;

  // Qual elemento está sendo arrastado: 'logo' | 'card' | null
  dragging = signal<'logo' | 'card' | null>(null);
  resizing = signal(false);

  // Posições em % (relativo ao preview container)
  logoPosX  = signal(50);
  logoPosY  = signal(12);
  logoWidth = signal(120);
  cardPosX  = signal(50);
  cardPosY  = signal(55);

  private _dragStartX = 0;
  private _dragStartY = 0;
  private _dragStartPosX = 0;
  private _dragStartPosY = 0;
  private _resizeStartW = 0;
  private _resizeStartMouseX = 0;

  startDrag(target: 'logo' | 'card', e: MouseEvent | TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragging.set(target);
    const pt = 'touches' in e ? e.touches[0] : e;
    this._dragStartX = pt.clientX;
    this._dragStartY = pt.clientY;
    this._dragStartPosX = target === 'logo' ? this.logoPosX() : this.cardPosX();
    this._dragStartPosY = target === 'logo' ? this.logoPosY() : this.cardPosY();
  }

  startResize(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.resizing.set(true);
    const pt = 'touches' in e ? e.touches[0] : e;
    this._resizeStartMouseX  = pt.clientX;
    this._resizeStartW       = this.logoWidth();
  }

  @HostListener('window:mousemove', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onMouseMove(e: MouseEvent | TouchEvent) {
    const pt = 'touches' in e ? e.touches[0] : e as MouseEvent;
    const container = this.previewContainerRef?.nativeElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (this.dragging()) {
      const dx = ((pt.clientX - this._dragStartX) / rect.width)  * 100;
      const dy = ((pt.clientY - this._dragStartY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, this._dragStartPosX + dx));
      const newY = Math.max(0, Math.min(100, this._dragStartPosY + dy));

      if (this.dragging() === 'logo') {
        this.logoPosX.set(newX);
        this.logoPosY.set(newY);
      } else {
        this.cardPosX.set(newX);
        this.cardPosY.set(newY);
      }
      this.syncPositionsToForm();
    }

    if (this.resizing()) {
      const deltaX = pt.clientX - this._resizeStartMouseX;
      const newW = Math.max(40, Math.min(300, this._resizeStartW + deltaX));
      this.logoWidth.set(Math.round(newW));
      this.syncPositionsToForm();
    }
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onMouseUp() {
    this.dragging.set(null);
    this.resizing.set(false);
  }

  private syncPositionsToForm() {
    this.surveyForm.patchValue({
      logoPosX:  this.logoPosX(),
      logoPosY:  this.logoPosY(),
      logoWidth: this.logoWidth(),
      cardPosX:  this.cardPosX(),
      cardPosY:  this.cardPosY(),
    }, { emitEvent: false });
  }

  // ── Upload imagem fundo ───────────────────────────────────────────────────

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.uploadFile(input.files[0]);
  }

  // ── Upload logo ───────────────────────────────────────────────────────────

  onLogoFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.uploadLogo(input.files[0]);
  }

  uploadLogo(file: File) {
    if (!file.type.startsWith('image/')) return;
    this.uploadingLogo.set(true);
    this.surveyService.uploadImage(file).subscribe({
      next: (res) => {
        this.surveyForm.get('companyLogoUrl')?.setValue(res.url);
        this.uploadingLogo.set(false);
      },
      error: () => this.uploadingLogo.set(false),
    });
  }

  @HostListener('dragover', ['$event'])
  onDragOver(e: DragEvent) { e.preventDefault(); this.dragOver.set(true); }

  @HostListener('dragleave')
  onDragLeave() { this.dragOver.set(false); }

  @HostListener('drop', ['$event'])
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) this.uploadFile(file);
  }

  onDropZone(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) this.uploadFile(file);
  }

  onDragOverZone(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.dragOver.set(true); }
  onDragLeaveZone() { this.dragOver.set(false); }

  uploadFile(file: File) {
    this.uploading.set(true);
    this.surveyService.uploadImage(file).subscribe({
      next: (res) => {
        this.surveyForm.get('backgroundImageUrl')?.setValue(res.url);
        this.surveyForm.get('backgroundGradient')?.setValue(null);
        this.uploading.set(false);
      },
      error: () => this.uploading.set(false),
    });
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  save() {
    if (this.surveyForm.invalid || this.saving()) return;
    this.saving.set(true);

    const v = this.surveyForm.value;
    const payload = {
      name:               v.name,
      slug:               v.slug || undefined,
      companyName:        v.companyName  || null,
      companyLogoUrl:     v.companyLogoUrl || null,
      welcomeTitle:       v.welcomeTitle,
      questionText:       v.questionText,
      showComment:        v.showComment,
      thankYouMsg:        v.thankYouMsg,
      backgroundColor:    v.backgroundColor    || null,
      backgroundGradient: v.backgroundGradient || null,
      backgroundImageUrl: v.backgroundImageUrl || null,
      primaryColor:       v.primaryColor       || null,
      textColor:          v.textColor          || null,
      cardColor:          v.cardColor          || null,
      buttonColor:        v.buttonColor        || null,
      buttonTextColor:    v.buttonTextColor    || null,
      logoBorderRadius:   v.logoBorderRadius   || null,
      // Posições livres
      logoPosX:  this.logoPosX(),
      logoPosY:  this.logoPosY(),
      logoWidth: this.logoWidth(),
      cardPosX:  this.cardPosX(),
      cardPosY:  this.cardPosY(),
      showLogoWelcome:  v.showLogoWelcome  ?? true,
      showLogoRating:   v.showLogoRating   ?? true,
      showLogoThankyou: v.showLogoThankyou ?? true,
      score5ImageUrl: v.score5ImageUrl || null,
      score4ImageUrl: v.score4ImageUrl || null,
      score3ImageUrl: v.score3ImageUrl || null,
      score2ImageUrl: v.score2ImageUrl || null,
      score1ImageUrl: v.score1ImageUrl || null,
      score5Label: v.score5Label || 'Muito Satisfeito',
      score4Label: v.score4Label || 'Satisfeito',
      score3Label: v.score3Label || 'Regular',
      score2Label: v.score2Label || 'Insatisfeito',
      score1Label: v.score1Label || 'Muito Insatisfeito',
      welcomeSubtitle:  v.welcomeSubtitle  || null,
      thankyouSubtitle: v.thankyouSubtitle || null,
      welcomeBtnText:   v.welcomeBtnText   || 'Começar',
      ratingBtnText:    v.ratingBtnText    || 'Enviar avaliação',
    };

    if (this.isCreateMode) {
      this.surveyService.create(payload).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.router.navigate(['/surveys', created.id, 'edit']);
        },
        error: () => this.saving.set(false),
      });
    } else {
      const s = this.survey()!;
      this.surveyService.update(s.id, payload).subscribe({
        next: (updated) => {
          this.survey.set(updated);
          this.saving.set(false);
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 2500);
        },
        error: () => this.saving.set(false),
      });
    }
  }

  goBack() { this.router.navigate(['/surveys']); }
}
