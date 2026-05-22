import { Component, OnInit, OnDestroy, signal, computed, inject, ElementRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizService, QuizConfig, QuizSession, QuizQuestion, AnswerResult } from '../../core/services/quiz.service';
import { FormTemplateService } from '../../core/services/form-template.service';

type QuizStep = 'loading' | 'register' | 'countdown' | 'question' | 'feedback' | 'result' | 'error';

@Component({
  selector: 'app-quiz-public',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './quiz-public.component.html',
  styleUrls: ['./quiz-public.component.scss'],
})
export class QuizPublicComponent implements OnInit, OnDestroy {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private quizService  = inject(QuizService);
  private fb           = inject(FormBuilder);
  private hostEl       = inject(ElementRef);

  // ── Estado ────────────────────────────────────────────────────────────────
  step = signal<QuizStep>('loading');
  quiz = signal<QuizConfig | null>(null);
  session = signal<QuizSession | null>(null);
  currentQuestionIndex = signal(0);
  lastAnswer = signal<AnswerResult | null>(null);
  selectedOptionId = signal<number | null>(null);
  timeLeft = signal(0);
  countdownValue = signal(3);
  errorMsg = signal('');

  currentQuestion = computed(() => {
    const q = this.quiz();
    const i = this.currentQuestionIndex();
    return q?.questions[i] ?? null;
  });

  progressPercent = computed(() => {
    const q = this.quiz();
    if (!q) return 0;
    return Math.round((this.currentQuestionIndex() / q.totalQuestions) * 100);
  });

  registerForm = this.fb.group({
    playerName: ['', [Validators.required, Validators.minLength(2)]],
    playerContact: ['', [Validators.required]],
  });

  private timerInterval: any = null;
  private questionStartTime = 0;
  slug = '';

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.quizService.getQuizBySlug(this.slug).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        this.applyAppearance(quiz);
        this.step.set('register');
      },
      error: () => {
        this.errorMsg.set('Quiz não encontrado ou inativo.');
        this.step.set('error');
      },
    });
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  // ── Cadastro ──────────────────────────────────────────────────────────────
  submitRegister() {
    if (this.registerForm.invalid) return;
    const { playerName, playerContact } = this.registerForm.value;
    this.quizService.startSession(this.slug, playerName!, playerContact!).subscribe({
      next: (session) => {
        this.session.set(session);
        this.startCountdown();
      },
      error: () => this.errorMsg.set('Erro ao iniciar quiz. Tente novamente.'),
    });
  }

  // ── Countdown 3..2..1 ─────────────────────────────────────────────────────
  private startCountdown() {
    this.step.set('countdown');
    this.countdownValue.set(3);
    const interval = setInterval(() => {
      const v = this.countdownValue() - 1;
      if (v <= 0) {
        clearInterval(interval);
        this.showQuestion();
      } else {
        this.countdownValue.set(v);
      }
    }, 1000);
  }

  // ── Pergunta ──────────────────────────────────────────────────────────────
  private showQuestion() {
    this.step.set('question');
    this.selectedOptionId.set(null);
    this.lastAnswer.set(null);
    const quiz = this.quiz()!;
    this.timeLeft.set(quiz.timePerQuestion);
    this.questionStartTime = Date.now();
    this.startTimer();
  }

  private startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      const t = this.timeLeft() - 1;
      if (t <= 0) {
        this.clearTimer();
        this.timeLeft.set(0);
        // Tempo esgotado — responde com null
        this.answerQuestion(null);
      } else {
        this.timeLeft.set(t);
      }
    }, 1000);
  }

  selectOption(optionId: number) {
    if (this.selectedOptionId() !== null) return; // já respondeu
    this.selectedOptionId.set(optionId);
    this.clearTimer();
    this.answerQuestion(optionId);
  }

  private answerQuestion(optionId: number | null) {
    const session = this.session()!;
    const question = this.currentQuestion()!;
    const timeTaken = Date.now() - this.questionStartTime;

    // Zera e para o timer assim que a resposta é enviada (evita valor "congelado" durante feedback)
    this.clearTimer();
    this.timeLeft.set(0);

    this.quizService.submitAnswer(session.id, question.id, optionId, timeTaken).subscribe({
      next: (result) => {
        this.lastAnswer.set(result);
        // Atualiza score na sessão local
        this.session.update(s => s ? { ...s, totalScore: result.totalScore } : s);
        this.step.set('feedback');
        // Avança após 1.5s
        setTimeout(() => this.nextQuestion(), 1500);
      },
    });
  }

  private nextQuestion() {
    const quiz = this.quiz()!;
    const next = this.currentQuestionIndex() + 1;
    if (next >= quiz.totalQuestions) {
      this.finishQuiz();
    } else {
      this.currentQuestionIndex.set(next);
      this.showQuestion();
    }
  }

  private finishQuiz() {
    const session = this.session()!;
    this.quizService.completeSession(session.id).subscribe({
      next: (completed) => {
        this.session.set(completed);
        this.step.set('result');
      },
    });
  }

  goToRanking() {
    this.router.navigate(['/quiz', this.slug, 'ranking']);
  }

  // ── Aparência — signals computados diretamente do quiz ───────────────────

  // Background aplicado inline no .quiz-page (mais confiável que CSS vars)
  quizBg = computed(() => {
    const q = this.quiz();
    if (!q) return '#0d1117';
    if (q.backgroundImageUrl) return `url('${q.backgroundImageUrl}') center/cover no-repeat`;
    if (q.backgroundGradient) return q.backgroundGradient;
    if (q.backgroundColor)    return q.backgroundColor;
    return '#0d1117';
  });

  quizPrimary   = computed(() => this.quiz()?.primaryColor || '#5b8dee');
  quizText      = computed(() => this.quiz()?.textColor    || '#e2e8f0');
  // Cor de fundo dos cards de opção; sem valor usa o padrão glassmorphism via CSS
  quizCardColor = computed(() => this.quiz()?.cardColor    || null);

  // Classe de rank para a tela de resultado
  rankClass = computed(() => {
    const pos = this.session()?.rankPosition;
    if (pos === 1) return 'stat-rank--gold';
    if (pos === 2) return 'stat-rank--silver';
    if (pos === 3) return 'stat-rank--bronze';
    return '';
  });

  rankEmoji = computed(() => {
    const pos = this.session()?.rankPosition;
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return '🏆';
  });

  // ── Timer circular SVG ────────────────────────────────────────────────────
  readonly RING_C = 2 * Math.PI * 34; // circunferência para r=34

  timerDashOffset = computed(() => {
    const max = this.quiz()?.timePerQuestion ?? 30;
    const ratio = max > 0 ? this.timeLeft() / max : 0;
    return this.RING_C * (1 - ratio);
  });

  timerRingColor = computed(() => {
    const max = this.quiz()?.timePerQuestion ?? 30;
    const ratio = max > 0 ? this.timeLeft() / max : 0;
    if (ratio > 0.5) return this.quizPrimary();
    if (ratio > 0.2) return '#f6ad55';
    return '#ff4f6a';
  });

  private applyAppearance(quiz: QuizConfig) {
    // CSS vars para cores dinâmicas (usadas no SCSS via var())
    const el: HTMLElement = this.hostEl.nativeElement;
    if (quiz.primaryColor) el.style.setProperty('--qprimary', quiz.primaryColor);
    if (quiz.textColor)    el.style.setProperty('--qtext',    quiz.textColor);
    // --qcard: cor dos cards de opção; sem valor o SCSS usa o fallback glassmorphism
    if (quiz.cardColor)    el.style.setProperty('--qcard',    quiz.cardColor);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  isCorrectOption(optionId: number): boolean {
    const answer = this.lastAnswer();
    return !!answer && answer.correctOptionId === optionId;
  }

  isWrongOption(optionId: number): boolean {
    const answer = this.lastAnswer();
    return !!answer && !answer.correct && this.selectedOptionId() === optionId;
  }

  isDimmedOption(optionId: number): boolean {
    const answer = this.lastAnswer();
    if (!answer) return false;
    return answer.correctOptionId !== optionId && this.selectedOptionId() !== optionId;
  }
}
