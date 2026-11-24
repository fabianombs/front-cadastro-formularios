import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QuizEditComponent } from './quiz-edit.component';
import { QuizService } from '../../core/services/quiz.service';

const QUIZ = {
  id: 1, name: 'Quiz', slug: 'quiz', timePerQuestion: 30, pointsPerQuestion: 1000,
  active: true, totalQuestions: 0, questions: [], quizLink: null, rankingLink: null,
  textColor: '#000080',
};

describe('QuizEditComponent — logo e cores de texto', () => {
  let service: any;

  function create(quiz: any = QUIZ) {
    service.getQuizById.mockReturnValue(of(quiz));
    const fixture = TestBed.createComponent(QuizEditComponent);
    fixture.detectChanges();
    return fixture;
  }

  function selectLogo(comp: QuizEditComponent, file: File) {
    comp.onLogoSelect({ target: { files: [file], value: 'x' } } as any);
  }

  beforeEach(() => {
    service = {
      getQuizById: vi.fn(),
      uploadFont: vi.fn().mockReturnValue(of({ url: '/quizzes/fonts/123e4567-e89b-12d3-a456-426614174000/L.woff' })),
      uploadImage: vi.fn().mockReturnValue(of({ url: 'https://img/logo.png' })),
      updateQuiz: vi.fn().mockReturnValue(of(QUIZ)),
    };
    TestBed.configureTestingModule({
      imports: [QuizEditComponent],
      providers: [
        { provide: QuizService, useValue: service },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      ],
    });
  });

  it('sem opções novas, mantém a cor de texto do quiz', () => {
    const c = create().componentInstance;
    expect(c.previewOptionText()).toBe('#000080');
    expect(c.previewRegisterText()).toBeNull();
    expect(c.previewLogo()).toBeNull();
  });

  it('envia logo e cores ao salvar', () => {
    const c = create().componentInstance;
    c.quizForm.patchValue({ logoUrl: 'https://img/l.png', registerTextColor: '#111111', optionTextColor: '#ffffff', questionCardColor: '#eeeeee', secondaryTextColor: '#777777' });
    expect(c.previewQuestionCardColor()).toBe('#eeeeee');
    expect(c.previewSecondaryText()).toBe('#777777');
    expect(c.previewOptionText()).toBe('#ffffff');
    c.save();
    expect(service.updateQuiz).toHaveBeenCalledWith(1, expect.objectContaining({
      logoUrl: 'https://img/l.png', registerTextColor: '#111111', optionTextColor: '#ffffff',
      questionCardColor: '#eeeeee', secondaryTextColor: '#777777',
    }));
  });

  it('preserva os valores já salvos ao editar outro campo', () => {
    const c = create({ ...QUIZ, logoUrl: 'L', registerTextColor: '#111111', optionTextColor: '#ffffff' }).componentInstance;
    c.save();
    expect(service.updateQuiz).toHaveBeenCalledWith(1, expect.objectContaining({
      logoUrl: 'L', registerTextColor: '#111111', optionTextColor: '#ffffff',
    }));
  });

  it('mostra a logo em todas as telas por padrão', () => {
    const fixture = create({ ...QUIZ, logoUrl: 'https://img/l.png' });
    for (const [mode, visible] of [['register', true], ['ranking', true], ['ready', true], ['question', true], ['result', true]] as const) {
      fixture.componentInstance.previewMode.set(mode);
      fixture.detectChanges();
      expect(!!fixture.nativeElement.querySelector('.prev-logo')).toBe(visible);
    }
  });

  it('esconde a logo só na tela desligada e salva a escolha', () => {
    const fixture = create({ ...QUIZ, logoUrl: 'https://img/l.png', showLogoReady: false });
    const c = fixture.componentInstance;
    for (const [mode, visible] of [['register', true], ['ranking', true], ['ready', false], ['question', true]] as const) {
      c.previewMode.set(mode);
      fixture.detectChanges();
      expect(!!fixture.nativeElement.querySelector('.prev-logo')).toBe(visible);
    }
    c.activeTab.set('appearance');
    fixture.detectChanges();
    const boxes = fixture.nativeElement.querySelectorAll('.logo-screen input');
    expect(boxes.length).toBe(5);
    boxes[3].click();
    c.save();
    expect(service.updateQuiz).toHaveBeenCalledWith(1, expect.objectContaining({
      showLogoRegister: true, showLogoReady: false, showLogoQuestion: true, showLogoResult: false, showLogoRanking: true,
    }));
  });

  it('envia PNG e guarda a URL', () => {
    const c = create().componentInstance;
    selectLogo(c, new File(['a'], 'l.png', { type: 'image/png' }));
    expect(c.quizForm.value.logoUrl).toBe('https://img/logo.png');
  });

  it('recusa formato não aceito e arquivo acima de 5 MB', () => {
    const c = create().componentInstance;
    selectLogo(c, new File(['a'], 'l.svg', { type: 'image/svg+xml' }));
    expect(c.logoError()).toContain('PNG');
    selectLogo(c, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'l.png', { type: 'image/png' }));
    expect(c.logoError()).toContain('5 MB');
    expect(service.uploadImage).not.toHaveBeenCalled();
  });

  it('campos: personaliza, ordena, valida e salva', () => {
    const c = create().componentInstance;
    c.customizeFields();
    c.addField();
    expect(c.fieldsError()).toContain('nome');
    c.save();
    expect(service.updateQuiz).not.toHaveBeenCalled();
    c.fieldsArray.at(2).patchValue({ label: 'Código LATAM', type: 'number' });
    expect(c.fieldsError()).toBeNull();
    c.moveField(2, -1);
    expect(c.previewFields().map(f => f.label)).toEqual(['Nome', 'Código LATAM', 'Sobrenome']);
    c.save();
    expect(service.updateQuiz.mock.calls[0][1].registerFields[1]).toMatchObject({
      label: 'Código LATAM', type: 'number', required: true, showInRanking: false,
    });
    c.fieldsArray.controls.forEach(f => f.patchValue({ showInRanking: false }));
    expect(c.fieldsError()).toContain('ranking');
    c.resetFields();
    expect(c.fieldsError()).toBeNull();
  });

  it('fonte: envia, recusa formato errado e remove', () => {
    const c = create().componentInstance;
    const pick = (f: File) => c.onFontSelect('fontUrl', { target: { files: [f], value: 'x' } } as any);
    pick(new File(['a'], 'f.exe'));
    expect(c.fontError()).toContain('WOFF');
    expect(service.uploadFont).not.toHaveBeenCalled();
    pick(new File(['a'], 'f.woff'));
    expect(c.fontName(c.quizForm.value.fontUrl)).toBe('L.woff');
    c.clearFont();
    c.save();
    expect(service.updateQuiz.mock.calls[0][1].fontUrl).toBeNull();
  });

  it('preserva a explicação e mostra erro ao salvar', () => {
    const c = create({ ...QUIZ, questions: [{ id: 1, question: 'P', imageUrl: null, orderIndex: 0, explanation: 'Porque', options: [] }] }).componentInstance;
    service.updateQuiz.mockReturnValue(throwError(() => ({ error: { message: 'Falhou' } })));
    c.save();
    expect(service.updateQuiz.mock.calls[0][1].questions[0].explanation).toBe('Porque');
    expect(c.saveError()).toBe('Falhou');
    expect(c.saving()).toBe(false);
  });

  it('avisa quando o envio falha', () => {
    service.uploadImage.mockReturnValue(throwError(() => new Error('x')));
    const c = create().componentInstance;
    selectLogo(c, new File(['a'], 'l.png', { type: 'image/png' }));
    expect(c.logoError()).toContain('Não foi possível');
    expect(c.uploading()).toBe(false);
  });
});
