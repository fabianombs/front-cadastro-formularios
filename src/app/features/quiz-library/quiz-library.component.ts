import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  QuizService,
  QuizConfig,
  QuizConfigRequest,
  QuizQuestionRequest,
  QuizOptionRequest,
  normalizeQuizLink,
} from '../../core/services/quiz.service';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-quiz-library',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageShellComponent, PageHeaderComponent],
  templateUrl: './quiz-library.component.html',
  styleUrls: ['./quiz-library.component.scss'],
})
export class QuizLibraryComponent implements OnInit {
  quizzes = signal<QuizConfig[]>([]);
  loading = signal(false);
  saving = signal(false);

  // Qual quiz está expandido para ver detalhes/links
  expandedId = signal<number | null>(null);

  // Controla modal de criação/edição
  showModal = signal(false);
  editingQuiz = signal<QuizConfig | null>(null);

  // Confirmação de exclusão
  deletingId = signal<number | null>(null);

  // Formulário do quiz
  quizForm!: FormGroup;

  constructor(
    private quizService: QuizService,
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadQuizzes();
  }

  private initForm(quiz?: QuizConfig) {
    this.quizForm = this.fb.group({
      name: [quiz?.name ?? '', Validators.required],
      slug: [quiz?.slug ?? ''],
      timePerQuestion: [quiz?.timePerQuestion ?? 30, [Validators.required, Validators.min(5), Validators.max(300)]],
      pointsPerQuestion: [quiz?.pointsPerQuestion ?? 1000, [Validators.required, Validators.min(100)]],
      questions: this.fb.array(
        quiz?.questions?.map(q => this.buildQuestionGroup(q)) ?? []
      ),
      // Aparência visual
      backgroundColor:    [quiz?.backgroundColor    ?? null],
      backgroundGradient: [quiz?.backgroundGradient ?? null],
      backgroundImageUrl: [quiz?.backgroundImageUrl ?? null],
      primaryColor:       [quiz?.primaryColor       ?? null],
    });
  }

  private buildQuestionGroup(q?: { question: string; imageUrl: string | null; orderIndex: number; options: { optionText: string; correct: boolean | null; orderIndex: number }[] }): FormGroup {
    return this.fb.group({
      question: [q?.question ?? '', Validators.required],
      imageUrl: [q?.imageUrl ?? null],
      orderIndex: [q?.orderIndex ?? 0],
      options: this.fb.array(
        q?.options?.map(o => this.buildOptionGroup(o)) ?? [
          this.buildOptionGroup({ optionText: '', correct: true,  orderIndex: 0 }),
          this.buildOptionGroup({ optionText: '', correct: false, orderIndex: 1 }),
          this.buildOptionGroup({ optionText: '', correct: false, orderIndex: 2 }),
          this.buildOptionGroup({ optionText: '', correct: false, orderIndex: 3 }),
        ]
      ),
    });
  }

  private buildOptionGroup(o?: { optionText: string; correct: boolean | null; orderIndex: number }): FormGroup {
    return this.fb.group({
      optionText: [o?.optionText ?? '', Validators.required],
      correct: [o?.correct ?? false],
      orderIndex: [o?.orderIndex ?? 0],
    });
  }

  // ── Getters para o form ────────────────────────────────────────────────────

  get questionsArray(): FormArray {
    return this.quizForm.get('questions') as FormArray;
  }

  getOptionsArray(qi: number): FormArray {
    return this.questionsArray.at(qi).get('options') as FormArray;
  }

  // ── CRUD quizzes ──────────────────────────────────────────────────────────

  loadQuizzes() {
    this.loading.set(true);
    this.quizService.listAll().subscribe({
      next: (list) => {
        // Normaliza os links para usar o domínio atual (corrige localhost:4200 em prod)
        const normalized = list.map(q => ({
          ...q,
          quizLink: normalizeQuizLink(q.quizLink),
          rankingLink: normalizeQuizLink(q.rankingLink),
        }));
        this.quizzes.set(normalized);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    // Navega para a página dedicada de criação em vez de abrir modal
    this.router.navigate(['/quizzes/new']);
  }

  openEdit(quiz: QuizConfig) {
    // Navega para a página dedicada de edição em vez de abrir modal
    this.router.navigate(['/quizzes', quiz.id, 'edit']);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingQuiz.set(null);
  }

  saveQuiz() {
    if (this.quizForm.invalid) return;
    this.saving.set(true);

    const formValue = this.quizForm.value;
    const payload: QuizConfigRequest = {
      name: formValue.name,
      slug: formValue.slug || undefined,
      timePerQuestion: formValue.timePerQuestion,
      pointsPerQuestion: formValue.pointsPerQuestion,
      questions: formValue.questions.map((q: QuizQuestionRequest & { options: QuizOptionRequest[] }, i: number) => ({
        question: q.question,
        imageUrl: q.imageUrl || null,
        orderIndex: i,
        options: q.options.map((o: QuizOptionRequest, j: number) => ({
          optionText: o.optionText,
          correct: o.correct,
          orderIndex: j,
        })),
      })),
      // Aparência visual
      backgroundColor:    formValue.backgroundColor    || null,
      backgroundGradient: formValue.backgroundGradient || null,
      backgroundImageUrl: formValue.backgroundImageUrl || null,
      primaryColor:       formValue.primaryColor       || null,
    };

    const existing = this.editingQuiz();
    const obs = existing
      ? this.quizService.updateQuiz(existing.id, payload)
      : this.quizService.createQuiz(payload);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadQuizzes();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(id: number) {
    this.deletingId.set(id);
  }

  cancelDelete() {
    this.deletingId.set(null);
  }

  deleteQuiz(id: number) {
    this.quizService.deleteQuiz(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.loadQuizzes();
      },
    });
  }

  toggleActive(quiz: QuizConfig) {
    this.quizService.toggleActive(quiz.id).subscribe({
      next: (updated) => {
        this.quizzes.update(list =>
          list.map(q => (q.id === updated.id ? updated : q))
        );
      },
    });
  }

  toggleExpanded(id: number) {
    this.expandedId.update(cur => (cur === id ? null : id));
  }

  copyLink(link: string | undefined) {
    if (link) navigator.clipboard.writeText(link);
  }

  // ── Aparência ─────────────────────────────────────────────────────────────

  clearAppearance(field: string) {
    this.quizForm.get(field)?.setValue(null);
  }

  hasAppearance(): boolean {
    const v = this.quizForm.value;
    return !!(v.backgroundColor || v.backgroundGradient || v.backgroundImageUrl || v.primaryColor);
  }

  previewBackground(): string {
    const v = this.quizForm.value;
    if (v.backgroundImageUrl) return `url('${v.backgroundImageUrl}') center/cover no-repeat`;
    if (v.backgroundGradient) return v.backgroundGradient;
    if (v.backgroundColor)    return v.backgroundColor;
    return 'var(--surface, #0d1117)';
  }

  // ── Manipulação de perguntas/opções ───────────────────────────────────────

  addQuestion() {
    this.questionsArray.push(this.buildQuestionGroup());
  }

  removeQuestion(qi: number) {
    this.questionsArray.removeAt(qi);
  }

  addOption(qi: number) {
    this.getOptionsArray(qi).push(this.buildOptionGroup({
      optionText: '',
      correct: false,
      orderIndex: this.getOptionsArray(qi).length,
    }));
  }

  removeOption(qi: number, oi: number) {
    this.getOptionsArray(qi).removeAt(oi);
  }

  // Marca uma opção como correta e desmarca as outras
  setCorrect(qi: number, oi: number) {
    const opts = this.getOptionsArray(qi);
    opts.controls.forEach((ctrl, i) => {
      ctrl.get('correct')?.setValue(i === oi);
    });
  }
}
