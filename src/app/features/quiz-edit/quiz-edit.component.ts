import {
  Component, OnInit, OnDestroy, signal, computed, effect, inject, HostListener, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  QuizService, QuizConfig, QuizRegisterField,
  QuizConfigRequest, QuizQuestionRequest, QuizOptionRequest,
} from '../../core/services/quiz.service';
import { loadQuizFont, quizFontName } from '../../core/utils/quiz-font';

@Component({
  selector: 'app-quiz-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './quiz-edit.component.html',
  styleUrls: ['./quiz-edit.component.scss'],
})
export class QuizEditComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private quizService = inject(QuizService);
  private fb          = inject(FormBuilder);
  private destroyRef  = inject(DestroyRef);

  quiz      = signal<QuizConfig | null>(null);
  loading   = signal(true);
  saving    = signal(false);
  uploading = signal(false);
  saveError = signal<string | null>(null);
  logoError = signal<string | null>(null);
  saved     = signal(false);  // feedback visual após save
  dragOver  = signal(false);

  // Aba ativa: 'content' | 'appearance'
  activeTab = signal<'content' | 'appearance'>('content');

  // Modo do preview ao vivo: qual tela mostrar no painel lateral
  previewMode = signal<'question' | 'register' | 'ready' | 'result' | 'ranking'>('question');

  quizForm!: FormGroup;

  // Espelho reativo do valor do form — atualizado via valueChanges para que os computed() reajam
  private formSnapshot = signal<Record<string, any>>({});

  fontSlots: { field: 'fontUrl' | 'fontBoldUrl'; label: string }[] = [
    { field: 'fontUrl', label: 'Normal' },
    { field: 'fontBoldUrl', label: 'Negrito (opcional)' },
  ];

  logoScreens = [
    { field: 'showLogoRegister', label: 'Cadastro' },
    { field: 'showLogoReady', label: 'Pronto' },
    { field: 'showLogoQuestion', label: 'Perguntas' },
    { field: 'showLogoResult', label: 'Resultado' },
    { field: 'showLogoRanking', label: 'Ranking' },
  ];

  gradientPresets = [
    { label: 'Noite Profunda',  value: 'linear-gradient(135deg,#0d1117,#1a1a2e)' },
    { label: 'Oceano',          value: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)' },
    { label: 'Roxo Espacial',   value: 'linear-gradient(135deg,#200122,#6f0000)' },
    { label: 'Floresta',        value: 'linear-gradient(135deg,#0a3d0a,#1e6b1e)' },
    { label: 'Pôr do sol',      value: 'linear-gradient(135deg,#f7971e,#ffd200)' },
    { label: 'Aurora',          value: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
    { label: 'Rosa Suave',      value: 'linear-gradient(135deg,#f093fb,#f5576c)' },
    { label: 'Esmeralda',       value: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  ];

  // true quando a rota é /quizzes/new (sem ID)
  isCreateMode = false;

  ngOnInit() {
    const rawId = this.route.snapshot.paramMap.get('id');

    // Modo criação: rota /quizzes/new não tem :id
    if (!rawId) {
      this.isCreateMode = true;
      this.initForm({} as QuizConfig);
      this.loading.set(false);
      return;
    }

    this.quizService.getQuizById(Number(rawId)).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        this.initForm(quiz);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/quizzes']);
      },
    });
  }

  private initForm(quiz: Partial<QuizConfig>) {
    this.quizForm = this.fb.group({
      name:              [quiz.name ?? '', Validators.required],
      slug:              [quiz.slug ?? ''],
      timePerQuestion:   [quiz.timePerQuestion ?? 30, [Validators.required, Validators.min(5), Validators.max(300)]],
      pointsPerQuestion: [quiz.pointsPerQuestion ?? 1000, [Validators.required, Validators.min(100)]],
      questions: this.fb.array(
        quiz.questions?.map(q => this.buildQuestionGroup(q)) ?? []
      ),
      fontUrl:            [quiz.fontUrl            ?? null],
      fontBoldUrl:        [quiz.fontBoldUrl        ?? null],
      registerFields: this.fb.array((quiz.registerFields ?? []).map(f => this.buildFieldGroup(f))),
      // Aparência
      backgroundColor:    [quiz.backgroundColor    ?? null],
      backgroundGradient: [quiz.backgroundGradient ?? null],
      backgroundImageUrl: [quiz.backgroundImageUrl ?? null],
      backgroundImageMobileUrl: [quiz.backgroundImageMobileUrl ?? null],
      backgroundImageTabletUrl: [quiz.backgroundImageTabletUrl ?? null],
      primaryColor:       [quiz.primaryColor       ?? null],
      textColor:          [quiz.textColor          ?? null],
      cardColor:          [quiz.cardColor          ?? null],
      // Cor dos cards de cadastro/ready
      registerCardColor:  [quiz.registerCardColor  ?? null],
      inputColor:         [quiz.inputColor         ?? null],
      rankingCardColor:   [quiz.rankingCardColor   ?? null],
      // Cor do botão principal e do texto dentro dos botões
      buttonColor:        [quiz.buttonColor        ?? null],
      buttonTextColor:    [quiz.buttonTextColor    ?? null],
      // Campos de texto da tela "Tudo pronto!"
      readyTitle:         [quiz.readyTitle         ?? null],
      readyMessage:       [quiz.readyMessage       ?? null],
      thankYouEnabled:    [quiz.thankYouEnabled    ?? false],
      thankYouTitle:      [quiz.thankYouTitle      ?? null],
      thankYouSubtitle:   [quiz.thankYouSubtitle   ?? null],
      thankYouParagraph:  [quiz.thankYouParagraph  ?? null],
      thankYouBgColor:          [quiz.thankYouBgColor          ?? null],
      thankYouBgGradient:       [quiz.thankYouBgGradient       ?? null],
      thankYouBgImageUrl:       [quiz.thankYouBgImageUrl       ?? null],
      thankYouBgImageMobileUrl: [quiz.thankYouBgImageMobileUrl ?? null],
      thankYouBgImageTabletUrl: [quiz.thankYouBgImageTabletUrl ?? null],
      thankYouIconColor:        [quiz.thankYouIconColor        ?? null],
      thankYouTitleColor:       [quiz.thankYouTitleColor       ?? null],
      thankYouTextColor:        [quiz.thankYouTextColor        ?? null],
      thankYouFontFamily:       [quiz.thankYouFontFamily       ?? null],
      thankYouTitleFontSize:    [quiz.thankYouTitleFontSize    ?? null],
      logoUrl:            [quiz.logoUrl            ?? null],
      registerTextColor:  [quiz.registerTextColor  ?? null],
      optionTextColor:    [quiz.optionTextColor    ?? null],
      questionCardColor:  [quiz.questionCardColor  ?? null],
      secondaryTextColor: [quiz.secondaryTextColor ?? null],
      showLogoRegister: [quiz.showLogoRegister ?? true],
      showLogoReady: [quiz.showLogoReady ?? true],
      showLogoQuestion: [quiz.showLogoQuestion ?? true],
      showLogoResult: [quiz.showLogoResult ?? true],
      showLogoRanking: [quiz.showLogoRanking ?? true],
    });

    // Inicializa snapshot e mantém atualizado para que computed() reajam ao form
    this.formSnapshot.set(this.quizForm.value);
    this.quizForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.formSnapshot.set(v));

    // Sincroniza registerCardColor ↔ rankingCardColor: mudar um atualiza o outro
    this.quizForm.get('registerCardColor')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        if (val !== this.quizForm.get('rankingCardColor')!.value) {
          this.quizForm.get('rankingCardColor')!.setValue(val, { emitEvent: false });
        }
      });

    this.quizForm.get('rankingCardColor')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        if (val !== this.quizForm.get('registerCardColor')!.value) {
          this.quizForm.get('registerCardColor')!.setValue(val, { emitEvent: false });
        }
      });
  }

  // ── Getters form ──────────────────────────────────────────────────────────

  get questionsArray(): FormArray {
    return this.quizForm.get('questions') as FormArray;
  }

  getOptionsArray(qi: number): FormArray {
    return this.questionsArray.at(qi).get('options') as FormArray;
  }

  private buildQuestionGroup(q?: any): FormGroup {
    return this.fb.group({
      question:  [q?.question ?? '', Validators.required],
      imageUrl:  [q?.imageUrl ?? null],
      explanation: [q?.explanation ?? ''],
      orderIndex:[q?.orderIndex ?? 0],
      options: this.fb.array(
        q?.options?.map((o: any) => this.buildOptionGroup(o)) ?? [
          this.buildOptionGroup({ optionText: '', correct: true,  orderIndex: 0 }),
          this.buildOptionGroup({ optionText: '', correct: false, orderIndex: 1 }),
          this.buildOptionGroup({ optionText: '', correct: false, orderIndex: 2 }),
          this.buildOptionGroup({ optionText: '', correct: false, orderIndex: 3 }),
        ]
      ),
    });
  }

  private buildOptionGroup(o?: any): FormGroup {
    return this.fb.group({
      optionText: [o?.optionText ?? '', Validators.required],
      correct:    [o?.correct ?? false],
      orderIndex: [o?.orderIndex ?? 0],
    });
  }

  // ── Perguntas / opções ────────────────────────────────────────────────────

  addQuestion() {
    this.questionsArray.push(this.buildQuestionGroup());
  }

  removeQuestion(qi: number) {
    this.questionsArray.removeAt(qi);
  }

  addOption(qi: number) {
    this.getOptionsArray(qi).push(this.buildOptionGroup({
      optionText: '', correct: false,
      orderIndex: this.getOptionsArray(qi).length,
    }));
  }

  removeOption(qi: number, oi: number) {
    this.getOptionsArray(qi).removeAt(oi);
  }

  setCorrect(qi: number, oi: number) {
    const opts = this.getOptionsArray(qi);
    opts.controls.forEach((ctrl, i) => ctrl.get('correct')?.setValue(i === oi));
  }

  // ── Campos do cadastro ────────────────────────────────────────────────────

  fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Só números' },
    { value: 'email', label: 'E-mail' },
    { value: 'tel', label: 'Telefone' },
  ];

  get fieldsArray(): FormArray {
    return this.quizForm.get('registerFields') as FormArray;
  }

  private buildFieldGroup(f?: Partial<QuizRegisterField>): FormGroup {
    return this.fb.group({
      id: [f?.id ?? `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`],
      label: [f?.label ?? '', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
      type: [f?.type ?? 'text'],
      required: [f?.required ?? true],
      showInRanking: [f?.showInRanking ?? false],
    });
  }

  customizeFields() {
    this.fieldsArray.push(this.buildFieldGroup({ label: 'Nome', showInRanking: true }));
    this.fieldsArray.push(this.buildFieldGroup({ label: 'Sobrenome', showInRanking: true }));
  }

  addField() {
    if (this.fieldsArray.length < 10) this.fieldsArray.push(this.buildFieldGroup());
  }

  removeField(i: number) { this.fieldsArray.removeAt(i); }

  resetFields() { this.fieldsArray.clear(); }

  moveField(i: number, delta: number) {
    const to = i + delta;
    if (to < 0 || to >= this.fieldsArray.length) return;
    const ctrl = this.fieldsArray.at(i);
    this.fieldsArray.removeAt(i);
    this.fieldsArray.insert(to, ctrl);
  }

  /** Mensagem do que falta nos campos do cadastro — null quando está tudo certo. */
  fieldsError(): string | null {
    const fields: QuizRegisterField[] = this.fieldsArray.value;
    if (!fields.length) return null;
    if (this.fieldsArray.invalid) return 'Dê um nome a cada campo.';
    const labels = fields.map(f => f.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) return 'Há campos com o mesmo nome.';
    if (!fields.some(f => f.required && f.showInRanking)) {
      return 'Pelo menos um campo deve ser obrigatório e aparecer no ranking.';
    }
    return null;
  }

  previewFields = computed<QuizRegisterField[]>(() => this.formSnapshot()['registerFields'] ?? []);

  // ── Fonte ─────────────────────────────────────────────────────────────────

  fontName = quizFontName;
  fontError = signal<string | null>(null);
  fontUploading = signal(false);
  previewFont = signal<string | null>(null);
  private fontPaths = computed(() => `${this.formSnapshot()['fontUrl'] ?? ''}|${this.formSnapshot()['fontBoldUrl'] ?? ''}`);

  private fontEffect = effect(() => {
    const key = this.fontPaths();
    const [regular, bold] = key.split('|');
    loadQuizFont(regular || null, bold || null).then(family => {
      if (this.fontPaths() === key) this.previewFont.set(family);
    });
  });

  onFontSelect(field: 'fontUrl' | 'fontBoldUrl', event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/\.(woff2?|otf|ttf)$/i.test(file.name)) {
      this.fontError.set('Use um arquivo WOFF2, WOFF, OTF ou TTF.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.fontError.set('A fonte deve ter no máximo 2 MB.');
      return;
    }
    this.fontError.set(null);
    this.fontUploading.set(true);
    this.quizService.uploadFont(file).subscribe({
      next: (res) => {
        this.quizForm.get(field)?.setValue(res.url);
        this.fontUploading.set(false);
      },
      error: () => {
        this.fontError.set('Não foi possível enviar a fonte. Tente novamente.');
        this.fontUploading.set(false);
      },
    });
  }

  clearFont() {
    this.quizForm.patchValue({ fontUrl: null, fontBoldUrl: null });
  }

  // ── Aparência ─────────────────────────────────────────────────────────────

  clearField(field: string) {
    this.quizForm.get(field)?.setValue(null);
  }

  // Preview ao vivo — lê formSnapshot() para reagir a cada mudança no form
  previewBg = computed(() => {
    const v = this.formSnapshot();
    if (v['backgroundImageUrl']) return `url('${v['backgroundImageUrl']}') center/cover no-repeat`;
    if (v['backgroundGradient']) return v['backgroundGradient'];
    if (v['backgroundColor'])    return v['backgroundColor'];
    return '#0d1117';
  });

  previewPrimary   = computed(() => this.formSnapshot()['primaryColor'] || '#5b8dee');
  previewText      = computed(() => this.formSnapshot()['textColor']    || '#e2e8f0');
  previewCardColor         = computed(() => this.formSnapshot()['cardColor']         || 'rgba(8,12,20,0.58)');
  previewRegisterCardColor = computed(() => this.formSnapshot()['registerCardColor'] || 'rgba(8,12,20,0.68)');
  previewInputColor        = computed(() => this.formSnapshot()['inputColor']        || 'rgba(255,255,255,0.06)');
  previewLogo              = computed(() => this.formSnapshot()['logoUrl']           || null);
  /** Logo da tela exibida no preview — null quando não há logo ou ela está desligada ali. */
  previewScreenLogo = computed(() => {
    const field = { question: 'showLogoQuestion', register: 'showLogoRegister', ready: 'showLogoReady', result: 'showLogoResult', ranking: 'showLogoRanking' }[this.previewMode()];
    return this.formSnapshot()[field] ? this.previewLogo() : null;
  });
  // null = mantém as cores de antes (texto do quiz com transparência)
  previewRegisterText      = computed(() => this.formSnapshot()['registerTextColor'] || null);
  previewOptionText        = computed(() => this.formSnapshot()['optionTextColor']   || this.previewText());
  // Mesmos padrões da tela pública, para o preview não enganar
  previewQuestionCardColor = computed(() => this.formSnapshot()['questionCardColor'] || 'rgba(8,12,20,0.65)');
  previewSecondaryText     = computed(() => this.formSnapshot()['secondaryTextColor'] || 'rgba(255,255,255,0.65)');
  previewRankingCardColor  = computed(() => this.formSnapshot()['rankingCardColor']  || 'rgba(8,12,20,0.65)');
  // Fallback: se buttonColor não definido, usa primaryColor
  previewButtonColor     = computed(() => this.formSnapshot()['buttonColor']     || this.formSnapshot()['primaryColor'] || '#5b8dee');
  previewButtonTextColor = computed(() => this.formSnapshot()['buttonTextColor'] || '#ffffff');

  // ── Upload de imagem ──────────────────────────────────────────────────────

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.uploadFile(input.files[0]);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(true);
  }

  @HostListener('dragleave')
  onDragLeave() { this.dragOver.set(false); }

  @HostListener('drop', ['$event'])
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) this.uploadFile(file);
  }

  uploadFile(file: File, field: string = 'backgroundImageUrl') {
    this.uploading.set(true);
    this.quizService.uploadImage(file).subscribe({
      next: (res) => {
        this.quizForm.get(field)?.setValue(res.url);
        // Só a imagem "web" (padrão, usada em qualquer tela) substitui gradiente/cor;
        // as versões de celular/tablet são um extra opcional em cima dela.
        if (field === 'backgroundImageUrl') {
          this.quizForm.get('backgroundGradient')?.setValue(null);
        }
        this.uploading.set(false);
      },
      error: () => this.uploading.set(false),
    });
  }

  /** Upload simples (sem drag & drop) para os campos opcionais de fundo por aparelho. */
  onFileSelectForField(field: string, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.uploadFile(input.files[0], field);
    input.value = '';
  }

  onLogoSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    // Mesmos limites do servidor (ver ImageUploadController)
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.logoError.set('Use uma imagem PNG ou JPG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.logoError.set('A imagem deve ter no máximo 5 MB.');
      return;
    }
    this.logoError.set(null);
    this.uploading.set(true);
    this.quizService.uploadImage(file).subscribe({
      next: (res) => {
        this.quizForm.get('logoUrl')?.setValue(res.url);
        this.uploading.set(false);
      },
      error: () => {
        this.logoError.set('Não foi possível enviar a logo. Tente novamente.');
        this.uploading.set(false);
      },
    });
  }

  onDropZone(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) this.uploadFile(file);
  }

  onDragOverZone(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeaveZone() { this.dragOver.set(false); }

  // ── Salvar ────────────────────────────────────────────────────────────────

  save() {
    if (this.quizForm.invalid || this.fieldsError() || this.saving()) return;
    this.saveError.set(null);
    this.saving.set(true);

    const v = this.quizForm.value;
    const payload: QuizConfigRequest = {
      name:              v.name,
      slug:              v.slug || undefined,
      timePerQuestion:   v.timePerQuestion,
      pointsPerQuestion: v.pointsPerQuestion,
      questions: v.questions.map((q: any, i: number) => ({
        question: q.question,
        imageUrl: q.imageUrl || null,
        explanation: q.explanation?.trim() || null,
        orderIndex: i,
        options: q.options.map((o: any, j: number) => ({
          optionText: o.optionText,
          correct: o.correct,
          orderIndex: j,
        })),
      })),
      fontUrl:            v.fontUrl            || null,
      fontBoldUrl:        v.fontUrl ? (v.fontBoldUrl || null) : null,
      registerFields:     v.registerFields,
      backgroundColor:    v.backgroundColor    || null,
      backgroundGradient: v.backgroundGradient || null,
      backgroundImageUrl: v.backgroundImageUrl || null,
      backgroundImageMobileUrl: v.backgroundImageMobileUrl || null,
      backgroundImageTabletUrl: v.backgroundImageTabletUrl || null,
      primaryColor:       v.primaryColor       || null,
      textColor:          v.textColor          || null,
      cardColor:          v.cardColor          || null,
      registerCardColor:  v.registerCardColor  || null,
      inputColor:         v.inputColor         || null,
      rankingCardColor:   v.rankingCardColor   || null,
      buttonColor:        v.buttonColor        || null,
      buttonTextColor:    v.buttonTextColor    || null,
      readyTitle:         v.readyTitle         || null,
      readyMessage:       v.readyMessage       || null,
      thankYouEnabled:    v.thankYouEnabled    ?? false,
      thankYouTitle:      v.thankYouEnabled ? (v.thankYouTitle || null) : null,
      thankYouSubtitle:   v.thankYouEnabled ? (v.thankYouSubtitle || null) : null,
      thankYouParagraph:  v.thankYouEnabled ? (v.thankYouParagraph || null) : null,
      thankYouBgColor:          v.thankYouEnabled ? (v.thankYouBgColor || null) : null,
      thankYouBgGradient:       v.thankYouEnabled ? (v.thankYouBgGradient || null) : null,
      thankYouBgImageUrl:       v.thankYouEnabled ? (v.thankYouBgImageUrl || null) : null,
      thankYouBgImageMobileUrl: v.thankYouEnabled ? (v.thankYouBgImageMobileUrl || null) : null,
      thankYouBgImageTabletUrl: v.thankYouEnabled ? (v.thankYouBgImageTabletUrl || null) : null,
      thankYouIconColor:        v.thankYouEnabled ? (v.thankYouIconColor || null) : null,
      thankYouTitleColor:       v.thankYouEnabled ? (v.thankYouTitleColor || null) : null,
      thankYouTextColor:        v.thankYouEnabled ? (v.thankYouTextColor || null) : null,
      thankYouFontFamily:       v.thankYouEnabled ? (v.thankYouFontFamily || null) : null,
      thankYouTitleFontSize:    v.thankYouEnabled ? (v.thankYouTitleFontSize || null) : null,
      logoUrl:            v.logoUrl            || null,
      registerTextColor:  v.registerTextColor  || null,
      optionTextColor:    v.optionTextColor    || null,
      questionCardColor:  v.questionCardColor  || null,
      secondaryTextColor: v.secondaryTextColor || null,
      showLogoRegister: v.showLogoRegister,
      showLogoReady: v.showLogoReady,
      showLogoQuestion: v.showLogoQuestion,
      showLogoResult: v.showLogoResult,
      showLogoRanking: v.showLogoRanking,
    };

    if (this.isCreateMode) {
      // Criação: chama createQuiz e redireciona para a rota de edição do novo quiz
      this.quizService.createQuiz(payload).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.router.navigate(['/quizzes', created.id, 'edit']);
        },
        error: (e) => this.saveFailed(e),
      });
    } else {
      const quiz = this.quiz()!;
      this.quizService.updateQuiz(quiz.id, payload).subscribe({
        next: (updated) => {
          this.quiz.set(updated);
          this.saving.set(false);
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 2500);
        },
        error: (e) => this.saveFailed(e),
      });
    }
  }

  private saveFailed(e: any) {
    this.saving.set(false);
    this.saveError.set(e?.error?.message || 'Não foi possível salvar. Tente novamente.');
  }

  goBack() {
    this.router.navigate(['/quizzes']);
  }
}
