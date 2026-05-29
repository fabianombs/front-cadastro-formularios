import {
  Component, OnInit, OnDestroy, signal, computed, inject, HostListener, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  QuizService, QuizConfig,
  QuizConfigRequest, QuizQuestionRequest, QuizOptionRequest,
} from '../../core/services/quiz.service';

@Component({
  selector: 'app-quiz-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
  saved     = signal(false);  // feedback visual após save
  dragOver  = signal(false);

  // Aba ativa: 'content' | 'appearance'
  activeTab = signal<'content' | 'appearance'>('content');

  // Modo do preview ao vivo: pergunta ou card de cadastro
  previewMode = signal<'question' | 'register'>('question');

  quizForm!: FormGroup;

  // Espelho reativo do valor do form — atualizado via valueChanges para que os computed() reajam
  private formSnapshot = signal<Record<string, any>>({});

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
      // Aparência
      backgroundColor:    [quiz.backgroundColor    ?? null],
      backgroundGradient: [quiz.backgroundGradient ?? null],
      backgroundImageUrl: [quiz.backgroundImageUrl ?? null],
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
    });

    // Inicializa snapshot e mantém atualizado para que computed() reajam ao form
    this.formSnapshot.set(this.quizForm.value);
    this.quizForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.formSnapshot.set(v));
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

  uploadFile(file: File) {
    this.uploading.set(true);
    this.quizService.uploadImage(file).subscribe({
      next: (res) => {
        this.quizForm.get('backgroundImageUrl')?.setValue(res.url);
        this.quizForm.get('backgroundGradient')?.setValue(null);
        this.uploading.set(false);
      },
      error: () => this.uploading.set(false),
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
    if (this.quizForm.invalid || this.saving()) return;
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
        orderIndex: i,
        options: q.options.map((o: any, j: number) => ({
          optionText: o.optionText,
          correct: o.correct,
          orderIndex: j,
        })),
      })),
      backgroundColor:    v.backgroundColor    || null,
      backgroundGradient: v.backgroundGradient || null,
      backgroundImageUrl: v.backgroundImageUrl || null,
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
    };

    if (this.isCreateMode) {
      // Criação: chama createQuiz e redireciona para a rota de edição do novo quiz
      this.quizService.createQuiz(payload).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.router.navigate(['/quizzes', created.id, 'edit']);
        },
        error: () => this.saving.set(false),
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
        error: () => this.saving.set(false),
      });
    }
  }

  goBack() {
    this.router.navigate(['/quizzes']);
  }
}
