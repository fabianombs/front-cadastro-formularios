import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuizPublicComponent } from './quiz-public.component';
import { QuizService } from '../../core/services/quiz.service';

const opts = [{ id: 1, optionText: 'Certa', orderIndex: 0, correct: null }, { id: 2, optionText: 'Outra', orderIndex: 1, correct: null }];
const QUIZ: any = {
  id: 1, name: 'Q', slug: 'q', timePerQuestion: 30, pointsPerQuestion: 1000, active: true, totalQuestions: 2,
  questions: [1, 2].map(id => ({ id, question: 'P' + id, imageUrl: null, orderIndex: id, options: opts })),
};
const FIELDS = [
  { id: 'n', label: 'Nome', type: 'text', required: true, showInRanking: true },
  { id: 'c', label: 'Código LATAM', type: 'number', required: true, showInRanking: false },
];

describe('QuizPublicComponent — campos e explicação', () => {
  let service: any;

  function create(quiz: any) {
    service.getQuizBySlug.mockReturnValue(of(quiz));
    const fixture = TestBed.createComponent(QuizPublicComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    const session = { id: 9, playerName: 'Ana', totalScore: 0 };
    service = {
      getQuizBySlug: vi.fn(),
      startSession: vi.fn().mockReturnValue(of(session)),
      startSessionWithFields: vi.fn().mockReturnValue(of(session)),
      submitAnswer: vi.fn(),
      completeSession: vi.fn().mockReturnValue(of(session)),
    };
    TestBed.configureTestingModule({
      imports: [QuizPublicComponent],
      providers: [
        { provide: QuizService, useValue: service },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ slug: 'q' }), queryParamMap: convertToParamMap({}) } } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('sem campos configurados, usa nome e contato', () => {
    const f = create(QUIZ);
    expect(f.nativeElement.querySelectorAll('.reg-input').length).toBe(2);
    f.componentInstance.registerForm.setValue({ playerName: 'Ana', playerContact: 'a@a.com' });
    f.componentInstance.submitRegister();
    expect(service.startSession).toHaveBeenCalledWith('q', 'Ana', 'a@a.com');
  });

  it('com campos configurados, valida e envia', () => {
    const c = create({ ...QUIZ, registerFields: FIELDS }).componentInstance;
    c.customForm.setValue({ n: '  ', c: 'abc' });
    c.submitRegister();
    expect(service.startSessionWithFields).not.toHaveBeenCalled();
    c.customForm.setValue({ n: 'Ana', c: '00123' });
    c.submitRegister();
    expect(service.startSessionWithFields).toHaveBeenCalledWith('q', { n: 'Ana', c: '00123' });
  });

  function answer(explanation: string | null) {
    service.submitAnswer.mockReturnValue(of({ correct: false, correctOptionId: 1, pointsEarned: 0, totalScore: 0, explanation }));
    const f = create(QUIZ);
    f.componentInstance.registerForm.setValue({ playerName: 'Ana', playerContact: 'a' });
    f.componentInstance.submitRegister();
    vi.advanceTimersByTime(3000);
    f.componentInstance.selectOption(2);
    f.detectChanges();
    return f;
  }

  it('com explicação, espera o botão Continuar', () => {
    const f = answer('Porque sim');
    expect(f.nativeElement.querySelector('.exp-card').textContent).toContain('Porque sim');
    expect(f.nativeElement.querySelector('.exp-card').textContent).toContain('Certa');
    vi.advanceTimersByTime(10000);
    expect(f.componentInstance.step()).toBe('feedback');
    f.nativeElement.querySelector('.exp-card button').click();
    f.componentInstance.continueAfterExplanation();
    expect(f.componentInstance.currentQuestionIndex()).toBe(1);
    f.componentInstance.ngOnDestroy();
  });

  it('sem explicação, avança sozinho como antes', () => {
    const f = answer(null);
    expect(f.nativeElement.querySelector('.exp-card')).toBeNull();
    vi.advanceTimersByTime(1500);
    expect(f.componentInstance.currentQuestionIndex()).toBe(1);
    f.componentInstance.ngOnDestroy();
  });
});
